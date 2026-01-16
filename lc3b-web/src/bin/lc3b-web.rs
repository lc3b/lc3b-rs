use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Router,
};

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(get_index))
        .route("/lc3b_bg.wasm", get(get_lc3b_wasm))
        .route("/lc3b.js", get(get_lc3b_js))
        .route("/static/js/{filename}", get(get_static_js))
        .route("/static/css/{filename}", get(get_static_css))
        .route("/static/media/{filename}", get(get_static_media));

    println!("LC-3b Simulator running at http://localhost:3000");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// React build assets
const REACT_INDEX: &[u8] = include_bytes!(env!("REACT_INDEX_PATH"));
const REACT_MAIN_JS: &[u8] = include_bytes!(env!("REACT_MAIN_JS_PATH"));
const REACT_MAIN_CSS: &[u8] = include_bytes!(env!("REACT_MAIN_CSS_PATH"));

// WASM assets
const LC3B_WASM: &[u8] = include_bytes!(env!("LC3B_PKG_WASM_PATH"));
const LC3B_JS: &[u8] = include_bytes!(env!("LC3B_PKG_JS_PATH"));

async fn get_index() -> impl IntoResponse {
    (StatusCode::OK, [("content-type", "text/html")], REACT_INDEX)
}

async fn get_lc3b_wasm() -> impl IntoResponse {
    (
        StatusCode::OK,
        [("content-type", "application/wasm")],
        LC3B_WASM,
    )
}

async fn get_lc3b_js() -> impl IntoResponse {
    (
        StatusCode::OK,
        [("content-type", "application/javascript")],
        LC3B_JS,
    )
}

async fn get_static_js(Path(_filename): Path<String>) -> impl IntoResponse {
    // All JS requests serve the main bundle (React only generates one main bundle)
    (
        StatusCode::OK,
        [("content-type", "application/javascript")],
        REACT_MAIN_JS,
    )
}

async fn get_static_css(Path(_filename): Path<String>) -> impl IntoResponse {
    // All CSS requests serve the main stylesheet
    (StatusCode::OK, [("content-type", "text/css")], REACT_MAIN_CSS)
}

async fn get_static_media(Path(_filename): Path<String>) -> impl IntoResponse {
    // Serve WASM file (webpack bundles it into static/media/)
    (
        StatusCode::OK,
        [("content-type", "application/wasm")],
        LC3B_WASM,
    )
}
