package com.pack25mahomet.cal

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.Gravity
import android.webkit.CookieManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageButton
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

// Thin WebView wrapper around the self-hosted dev server (see @string/server_url).
// Cleartext HTTP is allowed app-wide in the manifest since this points at a plain
// http:// LAN address, not a TLS-terminated deployment.
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.webViewClient = WebViewClient()

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        // A tap-only refresh button instead of a pull-to-refresh gesture — a
        // SwipeRefreshLayout previously wrapped the WebView here, but WebView
        // doesn't reliably report its internal scroll state to Android's view
        // system (especially with a page-level modal open), so it ended up
        // hijacking touch/drag input meant for the page. A plain overlay
        // button sits entirely outside the WebView's own view, so it can
        // never intercept anything happening inside it.
        val root = FrameLayout(this)
        root.addView(webView, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))

        val density = resources.displayMetrics.density
        val buttonSize = (56 * density).toInt()
        val margin = (16 * density).toInt()

        val padding = (14 * density).toInt()
        val refreshButton = ImageButton(this).apply {
            setImageResource(R.drawable.ic_refresh)
            background = ContextCompat.getDrawable(this@MainActivity, R.drawable.bg_refresh_button)
            setPadding(padding, padding, padding, padding)
            contentDescription = getString(R.string.refresh)
            elevation = 8f
            setOnClickListener { webView.reload() }
        }
        val buttonParams = FrameLayout.LayoutParams(buttonSize, buttonSize).apply {
            gravity = Gravity.BOTTOM or Gravity.END
            setMargins(margin, margin, margin, margin)
        }
        root.addView(refreshButton, buttonParams)

        setContentView(root)

        webView.loadUrl(getString(R.string.server_url))
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
