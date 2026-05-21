{
  "at": "2026-05-21T11:29:30.842Z",
  "href": "https://dynamicfont.ru/diag.html",
  "host": "dynamicfont.ru",
  "stressTest": {
    "at": "2026-05-21T11:29:30.842Z",
    "total": 12,
    "concurrency": 3,
    "timeoutMs": 12000,
    "overallTimeoutMs": 90000,
    "ok": 5,
    "fail": 7,
    "p50ms_ok": 12001,
    "p95ms_ok": 12011,
    "maxMs_all": 12012,
    "sample": [
      {
        "url": "/api/auth/session",
        "ok": false,
        "status": 0,
        "ms": 12005,
        "error": "timeout"
      },
      {
        "url": "/api/fontsource/abel?weight=400&style=normal&subset=latin",
        "ok": true,
        "status": 200,
        "ms": 12006,
        "bytes": 0
      },
      {
        "url": "/api/fontsource/42dot-sans?weight=400&style=normal&subset=cyrillic",
        "ok": false,
        "status": 0,
        "ms": 12007,
        "error": "timeout"
      },
      {
        "url": "/api/fontsource/abel?weight=400&style=normal&subset=latin",
        "ok": true,
        "status": 200,
        "ms": 11081,
        "bytes": 13094
      },
      {
        "url": "/api/auth/session",
        "ok": true,
        "status": 200,
        "ms": 12001,
        "bytes": 0
      },
      {
        "url": "/api/fontsource/42dot-sans?weight=400&style=normal&subset=cyrillic",
        "ok": false,
        "status": 0,
        "ms": 12000,
        "error": "timeout"
      },
      {
        "url": "/api/auth/session",
        "ok": false,
        "status": 0,
        "ms": 12011,
        "error": "timeout"
      },
      {
        "url": "/api/fontsource/abel?weight=400&style=normal&subset=latin",
        "ok": false,
        "status": 0,
        "ms": 12005,
        "error": "timeout"
      },
      {
        "url": "/api/fontsource/42dot-sans?weight=400&style=normal&subset=cyrillic",
        "ok": false,
        "status": 0,
        "ms": 12006,
        "error": "timeout"
      },
      {
        "url": "/api/auth/session",
        "ok": true,
        "status": 200,
        "ms": 7622,
        "bytes": 2
      },
      {
        "url": "/api/fontsource/abel?weight=400&style=normal&subset=latin",
        "ok": true,
        "status": 200,
        "ms": 12012,
        "bytes": 0
      },
      {
        "url": "/api/fontsource/42dot-sans?weight=400&style=normal&subset=cyrillic",
        "ok": false,
        "status": 0,
        "ms": 12010,
        "error": "timeout"
      }
    ]
  }
}