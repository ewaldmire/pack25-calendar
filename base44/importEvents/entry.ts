import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const VALID_DENS = ["lions", "tigers", "wolves", "bears", "webelos", "aols", "leaders"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const fileUrl = body.file_url;
    if (!fileUrl) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const extraction = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: "object",
        properties: {
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                date: { type: "string", description: "ISO date YYYY-MM-DD" },
                end_date: { type: "string", description: "ISO date YYYY-MM-DD for multi-day events" },
                start_time: { type: "string", description: "HH:MM 24h or human readable" },
                end_time: { type: "string" },
                location: { type: "string" },
                details: { type: "string" },
                dens: {
                  type: "array",
                  items: { type: "string", enum: VALID_DENS }
                }
              },
              required: ["name", "date"]
            }
          }
        },
        required: ["events"]
      }
    });

    if (extraction.status !== 'success' || !extraction.output) {
      return Response.json({ error: 'Could not extract events from the document', details: extraction.details }, { status: 422 });
    }

    const rawEvents = Array.isArray(extraction.output) ? extraction.output : extraction.output.events || [];
    const cleaned = rawEvents
      .filter(e => e && e.name && e.date)
      .map(e => ({
        name: String(e.name),
        date: String(e.date),
        end_date: e.end_date ? String(e.end_date) : "",
        start_time: e.start_time ? String(e.start_time) : "",
        end_time: e.end_time ? String(e.end_time) : "",
        location: e.location ? String(e.location) : "",
        details: e.details ? String(e.details) : "",
        dens: Array.isArray(e.dens) ? e.dens.filter(d => VALID_DENS.includes(d)) : []
      }));

    if (cleaned.length === 0) {
      return Response.json({ error: 'No valid events found in the document. Each event needs at least a name and a date.' }, { status: 422 });
    }

    const created = await base44.entities.Event.bulkCreate(cleaned);
    return Response.json({ created: created.length, events: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
