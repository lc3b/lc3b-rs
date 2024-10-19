use axum::{http::StatusCode, response::IntoResponse, routing::get, Router};

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(get_root))
        .route("/lc3b_bg.wasm", get(get_lc3b_wasm))
        .route("/lc3b.js", get(get_lc3b_js));

    println!("binding to http://0.0.0.0:3000");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn get_root() -> impl IntoResponse {
    (
        StatusCode::OK,
        [("content-type", "text/html")],
        LC3B_INDEX_BYTES,
    )
}

const LC3B_INDEX_BYTES: &[u8] = include_bytes!("../../templates/index.html");
const LC3B_WASM_BYTES: &[u8] = include_bytes!(env!("LC3B_PKG_WASM_PATH"));

async fn get_lc3b_wasm() -> impl IntoResponse {
    (
        StatusCode::OK,
        [("content-type", "application/wasm")],
        LC3B_WASM_BYTES,
    )
}

const LC3B_JS_BYTES: &[u8] = include_bytes!(env!("LC3B_PKG_JS_PATH"));

async fn get_lc3b_js() -> impl IntoResponse {
    (
        StatusCode::OK,
        [("content-type", "application/javascript")],
        LC3B_JS_BYTES,
    )
}
