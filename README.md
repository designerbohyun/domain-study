# 도메인 스터디

GPU 인프라 도메인 스터디 자료 사이트입니다. GPU 하드웨어 구조부터 메모리, 연결과 통신, 쿠버네티스 운영, AI 학습과 LLM 추론, 모니터링까지 23회차로 진행합니다.

사이트: https://designerbohyun.github.io/domain-study/

## 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 스터디 목차 (`assets/sessions.js`를 읽어 그림) |
| `glossary.html` | 용어 사전 (`assets/terms.js`를 읽어 그림) |
| `sessions/NN.html` | 회차별 자료. 목차는 `.part`, `section.ch`에서 자동 생성 |
| `assets/site.css` | Pico CSS 위에 얹는 공용 스타일 |
| `assets/site.js` | 용어 팝오버, 회차 목차, 이전·다음 회차, 목차·용어 사전 페이지 |

디자인은 [Pico CSS](https://picocss.com/)와 [Pretendard](https://github.com/orioncactus/pretendard)를 CDN으로 불러옵니다. 빌드 과정은 없습니다.

## 회차 추가하기

1. `sessions/02.html`을 복사해 `sessions/NN.html`을 만들고 본문을 바꿉니다. 그림 스크립트가 필요하면 `sessions/NN.js`를 함께 둡니다.
2. `assets/sessions.js`에서 해당 회차 줄에 `page: "sessions/NN.html"`을 추가합니다.
3. 새 용어는 `assets/terms.js`에 추가하고, `s`에 회차 번호를 적습니다. 본문에서는 `<button class="t" data-t="키">용어</button>`로 연결합니다.
4. `main` 브랜치에 push하면 1~2분 뒤 사이트에 반영됩니다.

## 로컬에서 보기

```sh
python3 -m http.server 8000
# http://localhost:8000
```
