# FRESH — LED Screen Media Controller & Presenter

Desktop application สำหรับควบคุมการแสดงผลบนจอ LED Display ลักษณะการทำงานคล้าย OBS Studio แต่เน้นการจัดการ Display / Media Queue / Canvas สำหรับจอ LED โดยเฉพาะ — มีหน้าต่างแยกกันสำหรับจัดวาง Layer (Control/Preview) และหน้าต่างส่งออกไปจอ LED จริง (Program Output)

## วัตถุประสงค์

ทำขึ้นเพื่อให้ผู้ควบคุม LED wall/จอแสดงผลสามารถ:

- จัดวาง วิดีโอ รูปภาพ กล้อง เว็บเพจ/YouTube และสตรีม RTSP/RTMP เป็น Layer บน Canvas ได้อย่างอิสระ (ลาก/ย่อ-ขยาย/หมุน)
- สลับสิ่งที่กำลังแสดงผลจริงบนจอ LED (Take/Cut/Fade) โดยไม่กระทบกับสิ่งที่กำลังจัดเตรียมอยู่ใน Preview
- บันทึก Layout เป็น Preset เรียกคืนด้วยคลิกเดียวหรือ Hotkey
- จัดคิวลำดับการแสดงผล (Auto-Advance / Manual)
- ควบคุมเสียงและปุ่มฉุกเฉิน BLACK/FREEZE แยกจากการแก้ไขที่กำลังทำอยู่

## Tech Stack

- **Framework:** Electron + React + TypeScript (scaffold ด้วย `electron-vite`)
- **UI:** TailwindCSS + Lucide Icons
- **Local Database:** better-sqlite3 (เก็บ Media Library, Presets, Canvas Resolution)
- **Media Processing:** ffmpeg-static + fluent-ffmpeg (probe/thumbnail/transcode/RTSP→HLS), hls.js (เล่น HLS stream)

## Requirements

- **Node.js** LTS (แนะนำ 20.x ขึ้นไป) และ **npm**
- **Python 3.9–3.11** สำหรับ build native module ผ่าน `node-gyp` — **ห้ามใช้ Python 3.12 ขึ้นไป** เพราะ `distutils` ถูกถอดออกไปแล้วทำให้ build ล้มเหลว ถ้าเครื่องมี Python เวอร์ชันใหม่เป็นค่าเริ่มต้น ให้ระบุ path ของ Python เก่ากว่าผ่าน env var `npm_config_python` (ดูตัวอย่างด้านล่าง)
- **macOS:** Xcode Command Line Tools (`xcode-select --install`)
- **Windows:** Visual Studio Build Tools (C++ build tools) สำหรับ compile native module

## การติดตั้ง (Installation)

```bash
npm install
```

ถ้า `npm install` ล้มเหลวตรงขั้นตอน build native module (เช่น `better-sqlite3`) เพราะ Python เวอร์ชันเครื่องใหม่เกินไป ให้รันแบบนี้แทน (แก้ path ตามเครื่องจริง):

```bash
npm_config_python=/usr/bin/python3 npm install
```

## การใช้งาน (Development)

```bash
npm run dev
```

จะเปิดสองหน้าต่าง:

- **FRESH — Control** หน้าจอควบคุมหลัก (Preview Canvas, Media Library, Layer Panel, Queue ฯลฯ)
- **FRESH — Output** หน้าจอส่งออกแบบไร้ขอบ (Borderless) สำหรับลากไปแสดงผลบนจอ LED / Display ที่สอง

Type check โค้ดทั้งหมด:

```bash
npm run typecheck
```

## Build เป็นไฟล์ติดตั้ง (Packaging)

```bash
npm run build:mac     # macOS → .dmg + .zip
npm run build:win     # Windows → .exe (NSIS installer)
npm run build:unpack  # build แบบ unpacked (ไม่สร้าง installer) สำหรับทดสอบเร็ว
```

ไฟล์ที่ได้จะอยู่ในโฟลเดอร์ `dist/`

> **หมายเหตุสำคัญ:** ถ้า build ข้าม platform บนเครื่องเดียวกัน (เช่น สั่ง `build:win` บนเครื่อง macOS) ขั้นตอน `@electron/rebuild` จะไป rebuild native module (`better-sqlite3`) ทับของเดิมใน `node_modules/` ด้วยไบนารีของ platform เป้าหมาย ทำให้ `npm run dev` ใช้ไม่ได้ต่อ (error `dlopen ... invalid mach-o file`) ต้อง rebuild กลับให้ตรงเครื่อง dev ก่อนใช้งานต่อ:
>
> ```bash
> npm_config_python=/usr/bin/python3 npx electron-builder install-app-deps
> ```

> **Unsigned build:** ไฟล์ติดตั้งยังไม่ได้เซ็นชื่อ (ไม่มี Apple Developer ID / Windows code signing certificate) ผู้ใช้จะเจอ macOS Gatekeeper ("ไม่ทราบผู้พัฒนา") หรือ Windows SmartScreen เตือนตอนเปิดแอปครั้งแรก ต้องกด "เปิดต่อไป" / "Run anyway" เอง — ถ้าจะแจกจ่ายจริงควรซื้อ code signing certificate มาเซ็นชื่อ

## โครงสร้างโปรเจกต์

```
src/
├── main/          # Electron main process — window management, IPC, SQLite, ffmpeg
├── preload/        # contextBridge API ที่ renderer เรียกผ่าน window.fresh
├── renderer/
│   ├── control/     # UI หน้าต่าง Control (Preview Canvas, Media Library, Queue, ...)
│   ├── output/       # UI หน้าต่าง Program Output
│   └── shared/        # canvas-engine, Zustand store, utils ที่ใช้ร่วมกันทั้งสอง window
└── shared/          # Types และ IPC channel constants ที่ใช้ร่วมกันระหว่าง main/preload/renderer
```

## สถานะปัจจุบัน

โปรเจกต์พัฒนาแบบแบ่ง Phase — ดูรายละเอียดความคืบหน้า ฟีเจอร์ที่ทำเสร็จ และ Roadmap ที่เหลือได้ในเอกสาร internal ของทีม (ไม่ได้ commit เข้า git repo)
