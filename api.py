import re
import json
import httpx
import asyncio
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, StreamingResponse, Response
from starlette.background import BackgroundTask
import time
import os
import urllib.parse
import base64

app = FastAPI(
    title="MovieBox API Pro",
    description="Full Pure REST API for moviebox.ph — Fixed Streaming Endpoint",
    version="2.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = "https://moviebox.ph"
API_BASE = "https://h5-api.aoneroom.com/wefeed-h5api-bff"

# আপডেট করা সঠিক স্ট্রিমিং বেস ইউআরএল
STREAM_BASE = "https://h5.aoneroom.com/wefeed-h5-bff"

_bearer_token: str | None = None

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Referer": "https://moviebox.ph/",
    "Origin": "https://moviebox.ph",
    "X-Client-Info": '{"timezone":"Asia/Dhaka"}',
    "X-Request-Lang": "en",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
}

PLAYER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://h5.aoneroom.com",
    "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
}

async def _get_bearer_token() -> str:
    """Auto-acquire a guest JWT from the x-user response header."""
    global _bearer_token
    if _bearer_token:
        return _bearer_token
    async with httpx.AsyncClient(follow_redirects=True, timeout=25) as client:
        resp = await client.get(f"{API_BASE}/home?host=moviebox.ph", headers=DEFAULT_HEADERS)
        x_user = resp.headers.get("x-user")
        if x_user:
            _bearer_token = json.loads(x_user).get("token")
        if not _bearer_token:
            cookie = resp.headers.get("set-cookie", "")
            m = re.search(r"token=([^;]+)", cookie)
            if m:
                _bearer_token = m.group(1)
    return _bearer_token or ""

async def _make_request(url: str, method: str = "GET", payload: dict = None, custom_headers: dict = None) -> dict:
    global _bearer_token
    token = await _get_bearer_token()
    headers = {
        **DEFAULT_HEADERS,
        "Authorization": f"Bearer {token}" if token else "",
        **(custom_headers or {})
    }
    async with httpx.AsyncClient(follow_redirects=True, timeout=25) as client:
        try:
            if method == "POST":
                resp = await client.post(url, headers=headers, json=payload)
            else:
                resp = await client.get(url, headers=headers)

            x_user = resp.headers.get("x-user")
            if x_user:
                new_token = json.loads(x_user).get("token")
                if new_token:
                    _bearer_token = new_token

            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Upstream API error: {resp.status_code}")

            return resp.json()
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            raise HTTPException(status_code=502, detail=f"Request failed: {str(e)}")

from fastapi.responses import FileResponse
import os

WEB_UI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "web-ui"))

@app.get("/")
async def root():
    return FileResponse(os.path.join(WEB_UI_DIR, "index.html"))

@app.get("/styles.css")
async def styles():
    return FileResponse(os.path.join(WEB_UI_DIR, "styles.css"))

@app.get("/app.js")
async def app_js():
    return FileResponse(os.path.join(WEB_UI_DIR, "app.js"))

@app.get("/home")
async def get_home():
    url = f"{API_BASE}/home?host=moviebox.ph"
    data = await _make_request(url)
    sections = []
    for op in data.get("data", {}).get("operatingList", []) or []:
        op_type = op.get("type")
        title = op.get("title", "Featured")
        if op_type == "BANNER":
            items = [{
                "name": item.get("title") or (item.get("subject") or {}).get("title"),
                "poster_url": item.get("image", {}).get("url") or (item.get("subject") or {}).get("cover", {}).get("url"),
                "slug": item.get("detailPath") or (item.get("subject") or {}).get("detailPath"),
                "subject_id": (item.get("subject") or {}).get("subjectId"),
                "badge": (item.get("subject") or {}).get("corner")
            } for item in op.get("banner", {}).get("items", []) if item.get("title") and "Communities" not in item.get("title")]
            sections.append({"section": "Banner", "count": len(items), "items": items})
        elif op_type in ["SUBJECTS_MOVIE", "SUBJECTS_TV", "SUBJECTS_ANIMATION"]:
            items = [{
                "name": sub.get("title"),
                "poster_url": sub.get("cover", {}).get("url"),
                "slug": sub.get("detailPath"),
                "subject_id": sub.get("subjectId"),
                "badge": sub.get("corner"),
                "rating": sub.get("imdbRatingValue")
            } for sub in op.get("subjects", [])]
            sections.append({"section": title, "count": len(items), "items": items})
    return {"status": "success", "sections": sections}

async def _get_category_data(tab_id: int, page: int = 1, per_page: int = 24, sort: str = "RECOMMEND") -> dict:
    url = f"{API_BASE}/subject/filter"
    payload = {"tabId": tab_id, "filter": {"sort": sort, "genre": "ALL", "country": "ALL", "year": "ALL", "language": "ALL"}, "page": page, "perPage": per_page}
    data = await _make_request(url, method="POST", payload=payload)
    inner = data.get("data", {})
    raw_items = inner.get("items", inner.get("subjects", []))
    items = [{
        "name": sub.get("title"),
        "poster_url": sub.get("cover", {}).get("url"),
        "slug": sub.get("detailPath"),
        "subject_id": sub.get("subjectId"),
        "badge": sub.get("corner"),
        "rating": sub.get("imdbRatingValue"),
        "year": sub.get("releaseDate", "")[:4] if sub.get("releaseDate") else None
    } for sub in raw_items]
    pager = inner.get("pager", {})
    total = pager.get("totalCount") or inner.get("total") or len(items)
    return {"page": page, "per_page": per_page, "total": total, "items": items}

@app.get("/movies")
async def get_movies(page: int = 1, sort: str = "RECOMMEND"):
    return await _get_category_data(tab_id=2, page=page, sort=sort)

@app.get("/tv-series")
async def get_tv_series(page: int = 1, sort: str = "RECOMMEND"):
    return await _get_category_data(tab_id=5, page=page, sort=sort)

@app.get("/animation")
async def get_animation(page: int = 1, sort: str = "RECOMMEND"):
    return await _get_category_data(tab_id=8, page=page, sort=sort)

@app.get("/search/suggest")
async def get_search_suggestions(q: str = Query(..., min_length=1)):
    url = f"{API_BASE}/subject/search-suggest"
    data = await _make_request(url, method="POST", payload={"keyword": q, "perPage": 10})
    inner = data.get("data", {})
    raw = inner.get("items", inner.get("list", []))
    suggestions = []
    for item in raw:
        sub = item.get("subject") or {}
        suggestions.append({
            "title": sub.get("title") or item.get("word") or item.get("title"),
            "slug": sub.get("detailPath") or item.get("detailPath"),
            "subject_id": sub.get("subjectId") or item.get("subjectId")
        })
    return {"suggestions": suggestions}

@app.get("/search")
async def search(q: str = Query(..., min_length=1), page: int = 1):
    url = f"{API_BASE}/subject/search"
    data = await _make_request(url, method="POST", payload={"keyword": q, "page": page, "perPage": 20})
    inner = data.get("data", {})
    raw = inner.get("items", inner.get("list", []))
    items = [{
        "name": sub.get("title"),
        "poster_url": sub.get("cover", {}).get("url"),
        "slug": sub.get("detailPath"),
        "subject_id": sub.get("subjectId")
    } for sub in raw]
    pager = inner.get("pager", {})
    total = pager.get("totalCount") or inner.get("total") or len(items)
    return {"query": q, "page": page, "total": total, "items": items}

@app.get("/detail/{slug:path}")
async def get_movie_detail(slug: str):
    url = f"{API_BASE}/detail?detailPath={slug}"
    return await _make_request(url)

# ----------------------------------------------------
# 📌 ফিক্স করা স্ট্রিমিং এন্ডপয়েন্ট (Aoneroom Direct MP4 Stream)
# ----------------------------------------------------
@app.get("/api/stream/{subject_id}")
async def get_stream_sources(subject_id: str, detail_path: str = "", se: int = 0, ep: int = 0):
    # আপনার রিকমেন্ড করা ওয়ার্কিং পাথ
    play_url = f"{STREAM_BASE}/web/subject/play?subjectId={subject_id}&se={se}&ep={ep}&detailPath={detail_path}"
    
    player_referer = f"https://h5.aoneroom.com/spa/videoPlayPage/movies/{detail_path}?id={subject_id}&type=/movie/detail&detailSe={se}&detailEp={ep}&lang=en"

    token = await _get_bearer_token()
    headers = {
        **PLAYER_HEADERS, 
        "Referer": player_referer,
        "Authorization": f"Bearer {token}" if token else ""
    }

    async with httpx.AsyncClient(follow_redirects=True, timeout=25) as client:
        resp = await client.get(play_url, headers=headers)
        
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Stream service unavailable")
            
        res_json = resp.json()
        data = res_json.get("data", {})

    has_resource = data.get("hasResource", False)
    
    streams = [
        {
            "resolution": f"{s.get('resolutions')}p" if s.get('resolutions') else "HD",
            "format": s.get("format", "mp4"),
            "url": s.get("url"),
            "size": s.get("size"),
            "duration": s.get("duration"),
            "codec": s.get("codecName")
        }
        for s in data.get("streams", []) if s.get("url")
    ]
    
    return {
        "subject_id": subject_id,
        "se": se,
        "ep": ep,
        "has_resource": has_resource or len(streams) > 0,
        "sources": streams,
        "hls": data.get("hls", []),
        "dash": data.get("dash", []),
        "free_episodes": data.get("freeNum"),
        "limited": data.get("limited", False),
        "note": None if (has_resource or len(streams) > 0) else "No stream found for this selection."
    }

@app.get("/api/stream/{subject_id}/captions")
async def get_captions(subject_id: str, detail_path: str = "", se: int = 0, ep: int = 0):
    play_url = f"{STREAM_BASE}/web/subject/play?subjectId={subject_id}&se={se}&ep={ep}&detailPath={detail_path}"
    player_referer = f"https://h5.aoneroom.com/spa/videoPlayPage/movies/{detail_path}?id={subject_id}&type=/movie/detail&detailSe={se}&detailEp={ep}&lang=en"

    async with httpx.AsyncClient(follow_redirects=True, timeout=25) as client:
        play_resp = await client.get(play_url, headers={**PLAYER_HEADERS, "Referer": player_referer})
        play_data = play_resp.json().get("data", {})

    streams = play_data.get("streams", [])
    dash = play_data.get("dash", [])

    stream_id = None
    stream_format = None
    if streams:
        stream_id = streams[0].get("id")
        stream_format = streams[0].get("format", "MP4")
    elif dash:
        stream_id = dash[0].get("id")
        stream_format = dash[0].get("format", "DASH")

    if not stream_id:
        return {"subject_id": subject_id, "se": se, "ep": ep, "count": 0, "captions": []}

    cap_url = (
        f"{API_BASE}/subject/caption"
        f"?format={stream_format}&id={stream_id}&subjectId={subject_id}&detailPath={detail_path}"
    )
    data = await _make_request(cap_url)
    inner = data.get("data", {})
    captions = inner.get("captions", []) if isinstance(inner, dict) else inner
    return {"subject_id": subject_id, "se": se, "ep": ep, "count": len(captions), "captions": captions}

@app.get("/api/proxy_stream")
async def proxy_stream(request: Request, url: str):
    import base64
    from starlette.background import BackgroundTask
    try:
        safe_b64 = url.replace(' ', '+')
        safe_b64 += '=' * (-len(safe_b64) % 4)
        decoded_url = base64.b64decode(safe_b64).decode('utf-8')
    except Exception:
        decoded_url = url  # Fallback if not base64

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        "Referer": "https://netfilm.world/"
    }
    
    range_header = request.headers.get("Range")
    if range_header:
        headers["Range"] = range_header

    client = httpx.AsyncClient(follow_redirects=True, timeout=30.0)
    req = client.build_request("GET", decoded_url, headers=headers)
    
    response = await client.send(req, stream=True)

    async def _cleanup_stream(resp, cli):
        await resp.aclose()
        await cli.aclose()
    
    return StreamingResponse(
        response.aiter_raw(),
        status_code=response.status_code,
        headers={
            k: v for k, v in response.headers.items() 
            if k.lower() in ['content-type', 'content-length', 'content-range', 'accept-ranges']
        },
        background=BackgroundTask(_cleanup_stream, response, client)
    )

@app.get("/api/proxy_caption")
async def proxy_caption(url: str):
    import base64
    try:
        safe_b64 = url.replace(' ', '+')
        safe_b64 += '=' * (-len(safe_b64) % 4)
        decoded_url = base64.b64decode(safe_b64).decode('utf-8')
    except Exception:
        decoded_url = url

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        "Referer": "https://moviebox.ph/"
    }
    
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20.0) as client:
            resp = await client.get(decoded_url, headers=headers)
            content = resp.text
            
        # Strip UTF-8 BOM if present
        content = content.lstrip('\ufeff')

        if not content.startswith("WEBVTT"):
            import re
            content = re.sub(r'(\d{2}:\d{2}:\d{2}),(\d{3})', r'\1.\2', content)
            content = "WEBVTT\n\n" + content
            
        return Response(content=content, media_type="text/vtt")
    except Exception:
        return Response(content="WEBVTT\n\n", media_type="text/vtt")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
