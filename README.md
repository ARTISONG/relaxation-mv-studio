# 🎵 Relaxation MV Studio

Audio-Reactive Generative Art สำหรับสร้าง MV ผ่อนคลาย/นอนหลับ บน YouTube

## 🚀 Deploy บน GitHub Pages (ทำครั้งเดียว)

### ขั้นตอนที่ 1: สร้าง Repository
1. ไปที่ https://github.com/new
2. ตั้งชื่อ repo เช่น `relaxation-mv-studio`
3. เลือก **Public**
4. กด **Create repository**

### ขั้นตอนที่ 2: Push code ขึ้น GitHub
```bash
# Clone หรือ copy ไฟล์ทั้งหมดเข้า folder
cd relaxation-mv-studio

# Init git
git init
git add .
git commit -m "initial commit"

# เชื่อมกับ GitHub (เปลี่ยน USERNAME เป็น username ของคุณ)
git remote add origin https://github.com/USERNAME/relaxation-mv-studio.git
git branch -M main
git push -u origin main
```

### ขั้นตอนที่ 3: เปิด GitHub Pages
1. ไปที่ repo บน GitHub
2. **Settings** → **Pages**
3. Source เลือก **GitHub Actions**
4. รอ 1-2 นาทีให้ build เสร็จ

### ขั้นตอนที่ 4: เปิดเว็บ
```
https://USERNAME.github.io/relaxation-mv-studio/
```

---

## 💻 รันบนเครื่องตัวเอง (Development)

```bash
# ติดตั้ง dependencies
npm install

# รัน dev server
npm run dev
```

เปิด browser ไปที่ http://localhost:5173/relaxation-mv-studio/

---

## ⚠️ สำคัญ: ถ้าเปลี่ยนชื่อ Repo

เปิดไฟล์ `vite.config.js` แล้วเปลี่ยน `base` ให้ตรงกับชื่อ repo:

```js
base: '/ชื่อ-repo-ของคุณ/',
```

---

## 🎨 Features
- 6 Generative Art Motions ขับเคลื่อนด้วย Audio FFT 7 Bands
- Drag & Drop อัปโหลดเพลง
- ตั้งจำนวน Loop + เลือก Resolution
- Preview แบบ Real-time
- Export เป็น WebM (video + audio)
- Generate YouTube Cover (PNG)
- ตั้งตำแหน่งชื่อเพลง 9 จุด + ขนาด font
- Fade out 10 วินาทีสุดท้าย
