<div align="center">

<img src="./docs/screenshots/03-home.png" width="250" alt="푸디몬">

# 🌱 푸디몬 (Foodymon)

### 나의 하루를 나누면, 우리 사이도 자라나요

캐릭터를 돌보며 **식사 · 수면 · 마음**을 기록하는 습관 형성 앱

작은 알에서 시작해, 내가 하루를 나눌수록 푸디몬이 함께 자랍니다.

<br>

[![Demo](https://img.shields.io/badge/🔗_데모_체험하기-2F6B4F?style=for-the-badge)](https://foodymon.expo.app/)

![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.0-2F6B4F?style=flat-square)

</div>

---

## 📖 소개

기록은 귀찮습니다. 혼자 하면 더 그렇습니다.

푸디몬은 **기록이라는 지루한 행위를 "돌봄"이라는 동기로 바꿉니다.**
사용자가 식사·수면·마음을 남기면 캐릭터가 그만큼 자랍니다.
나를 위해서가 아니라 **쟤를 위해서** 기록하게 되는 구조입니다.

> *"작은 알이 당신의 하루를 기다리고 있어요"*

<br>

## 📱 화면

<div align="center">
<table>
  <tr>
    <td align="center"><b>홈 · 캐릭터</b></td>
    <td align="center"><b>하루 요약</b></td>
    <td align="center"><b>꾸미기</b></td>
  </tr>
  <tr>
    <td><img src="./docs/screenshots/03-home.png" width="230"></td>
    <td><img src="./docs/screenshots/04-summary.png" width="230"></td>
    <td><img src="./docs/screenshots/05-dressroom.png" width="230"></td>
  </tr>
  <tr>
    <td align="center"><b>식사 기록</b></td>
    <td align="center"><b>수면 기록</b></td>
    <td align="center"><b>마음 기록</b></td>
  </tr>
  <tr>
    <td><img src="./docs/screenshots/06-meal.png" width="230"></td>
    <td><img src="./docs/screenshots/07-sleep.png" width="230"></td>
    <td><img src="./docs/screenshots/08-mood.png" width="230"></td>
  </tr>
  <tr>
    <td align="center"><b>100일 여정</b></td>
    <td align="center"><b>도움 받기</b></td>
    <td align="center"><b>마이페이지</b></td>
  </tr>
  <tr>
    <td><img src="./docs/screenshots/10-journey.png" width="230"></td>
    <td><img src="./docs/screenshots/09-help.png" width="230"></td>
    <td><img src="./docs/screenshots/11-mypage.png" width="230"></td>
  </tr>
</table>
</div>

<br>

## ✨ 주요 기능

| 기능 | 설명 |
|:---|:---|
| 🍽 **식사 기록** | 6개 시간대 × 6가지 상태 + 사진 첨부 |
| 🌙 **수면 기록** | 취침·기상 시각 입력, 수면 시간 자동 계산 |
| 💗 **마음 기록** | 하루 최대 3회, 감정 선택 기록 |
| 📖 **일기** | 하루에 한 번 자유 서술 |
| 🌱 **캐릭터 성장** | 성장점 누적에 따른 레벨업 · 진화 |
| 👕 **꾸미기** | 의상 · 마이룸 |
| 🎁 **숲의 선물 상자** | 미보유 아이템 랜덤 획득 |
| 🗺 **100일 여정** | 4개 구역으로 나뉜 100일 기록 맵 |
| 🚩 **작은 목표** | 부담 없는 단위의 데일리 목표 |
| 📊 **하루 요약** | 성장점 추이(7·14·30일) · 기록 통계 |
| 📚 **컬렉션 도감** | 진화 도감 · 의상/소품 · 배지와 방패 |
| 📷 **식사 앨범** | 사진으로 남긴 식사 모아보기 |
| 🎵 **배경음악** | 숲의 노래 on/off |
| 🆘 **도움 받기** | 위기 상황 전문 상담 연결 |

<br>

## 📐 성장점 산정 기준

**하루 최대 100점**이며, 네 영역으로 나뉩니다.

| 영역 | 배점 | 비중 |
|:---|---:|:---|
| 🍽 식사 | **40점** | ████████ 40% |
| 🌙 수면 | **30점** | ██████ 30% |
| 🚩 작은 목표 | **20점** | ████ 20% |
| 💗 마음 | **10점** | ██ 10% |
| **합계** | **100점** | |

식사와 수면에 배점을 크게 둔 것은 **생활 리듬의 뼈대**이기 때문입니다.
마음 기록은 부담을 주지 않도록 배점을 낮게 설계했습니다.

### 레벨업 기준

```
레벨당 필요 성장점: 500점
→ 하루 만점(100점) 기준 약 5일에 1레벨
```

### 수면 가이드 기준

앱 내에서 **성인 생활 리듬 가이드**를 제시합니다.

```
권장 취침  오후 10:00 ~ 오후 11:00
권장 수면  7 ~ 9시간
```

<br>

## 🗺 100일 여정

기록 100일을 네 개의 구역으로 나눈 맵입니다.

| 구역 | 기간 |
|:---|:---|
| 🌱 1구역 · 새싹 숲 | 1 ~ 25일 |
| 🌸 2구역 · 꽃 들판 | 26 ~ 50일 |
| ⭐ 3구역 · 별빛 호수 | 51 ~ 75일 |
| ☁️ 4구역 · 구름 언덕 | 76 ~ 100일 |

> *"쉬어 간 날도 길의 일부예요"*

<br>

## 🍬 재화와 보상

꾸미기 아이템은 **젤리**로 구매합니다.

| 항목 | 가격 |
|:---|---:|
| 꽃장식 | 🍬 20 |
| 선글라스 | 🍬 40 |
| 왕관 | 🍬 50 |
| 토끼 귀 | 🍬 50 |
| 마법사 모자 | 🍬 60 |
| 숲의 선물 상자 *(랜덤)* | 🍬 30 |
| 기록 복구권 | 🍬 20 |

보유 재화는 **연속 기록 · 젤리 · 방패** 세 가지이며, 마이페이지에서 확인합니다.

> **기록 복구**: 어제 기록을 놓쳤어도 🍬20으로 되살릴 수 있습니다.
> 하루 빠뜨렸다고 포기하게 두지 않으려는 장치입니다.

<br>

## 🧭 설계 원칙

이 앱은 **기록을 강요하지 않는 것**을 원칙으로 삼았습니다.

- **쉬어가는 날을 허용합니다** — *"오늘은 목표를 쉬어 가요"*, *"쉬어 간 날도 길의 일부예요"*
- **판단하지 않습니다** — 식사 상태에 *"먹기 어려웠어"*, *"답하고 싶지 않아"* 선택지
- **정답이 없습니다** — *"어떤 마음이든 정답은 없어"*
- **되돌릴 수 있습니다** — 놓친 기록은 복구권으로 회복
- **힘들 때 연결합니다** — 마음 기록에 *"도움 받기"* 상시 노출

<br>

## 🆘 도움 받기

섭식·정신건강 위기 상황에서 전문 기관으로 즉시 연결합니다.

| 상황 | 연락처 |
|:---|:---|
| 응급 상황 *(쓰러짐·구토·심한 통증)* | **119** |
| 자살예방 상담전화 *(24시간)* | **109** |
| 정신건강 위기상담 *(24시간)* | **1577-0199** |
| 청소년상담 *(24시간)* | **1388** |

> *"도움을 청하는 건 용기 있는 일이야."*

<br>

## 🔐 개인정보 처리

수면·식사·마음 기록은 **건강 관련 민감정보**에 해당합니다.
회원가입 시 아래 항목에 대해 별도 동의를 받습니다.

- [필수] 개인정보 수집·이용 동의
- [필수] 수면·식사·마음 기록(건강 관련 민감정보) 처리 동의
- 만 14세 미만은 보호자의 동의가 필요합니다

<br>

## 🛠 기술 스택

| 구분 | 사용 기술 |
|:---|:---|
| Framework | React Native (Expo) |
| Routing | Expo Router |
| Language | TypeScript |
| Auth | 이메일 · 카카오 · Google OAuth |
| Deploy | Expo (Web) |

<br>

<details>
<summary><b>🚀 실행 방법</b></summary>

<br>

```bash
npm install
npx expo start
npx expo start --web
```

</details>

<details>
<summary><b>🗂 주요 라우트</b></summary>

<br>

```
/            홈 (캐릭터 · 기록 진입)
/summary     하루 요약 · 성장점 추이
/mypage      마이페이지 · 내 정보 · 컬렉션
/journey     100일 여정 맵
/dressroom   꾸미기 (의상 · 마이룸)
/help        도움 받기
```

</details>

<br>

---

<div align="center">

**🔗 [지금 바로 체험해보기](https://foodymon.expo.app/)**

</div>
