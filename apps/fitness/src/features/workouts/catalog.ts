/** คลังท่าฝึกตามกล้ามเนื้อแต่ละมัด (pure — ใช้ได้ทั้งฝั่ง server และ client) */

export const MUSCLES = [
  'upper-chest', 'lower-chest', 'shoulders', 'rear-delts', 'biceps', 'triceps', 'forearms',
  'upper-abs', 'middle-abs', 'lower-abs', 'obliques', 'traps', 'lats', 'upper-back', 'lower-back',
  'glutes', 'quads', 'hamstrings', 'adductors', 'calves',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  'upper-chest': 'อกบน',
  'lower-chest': 'อกล่าง',
  shoulders: 'ไหล่หน้า/ข้าง',
  'rear-delts': 'ไหล่หลัง',
  biceps: 'แขนหน้า',
  triceps: 'แขนหลัง',
  forearms: 'ปลายแขน',
  'upper-abs': 'หน้าท้องบน',
  'middle-abs': 'หน้าท้องกลาง',
  'lower-abs': 'หน้าท้องล่าง',
  obliques: 'เอวข้าง',
  traps: 'บ่า',
  lats: 'ปีก',
  'upper-back': 'หลังบน',
  'lower-back': 'หลังล่าง',
  glutes: 'ก้น',
  quads: 'ต้นขาหน้า',
  hamstrings: 'ต้นขาหลัง',
  adductors: 'ขาด้านใน',
  calves: 'น่อง',
};

/** จัดกลุ่มปุ่มเลือกกล้ามเนื้อให้หาง่าย */
export const MUSCLE_REGIONS: readonly { label: string; muscles: readonly Muscle[] }[] = [
  { label: 'อกและไหล่', muscles: ['upper-chest', 'lower-chest', 'shoulders', 'rear-delts'] },
  { label: 'แขน', muscles: ['biceps', 'triceps', 'forearms'] },
  { label: 'หลัง', muscles: ['traps', 'lats', 'upper-back', 'lower-back'] },
  { label: 'แกนกลาง', muscles: ['upper-abs', 'middle-abs', 'lower-abs', 'obliques'] },
  { label: 'ก้นและขา', muscles: ['glutes', 'quads', 'hamstrings', 'adductors', 'calves'] },
];

export function isMuscle(value: unknown): value is Muscle {
  return typeof value === 'string' && (MUSCLES as readonly string[]).includes(value);
}

export interface Exercise {
  id: string;
  name: string;
  /** กล้ามเนื้อที่ได้ — ตัวแรกคือเป้าหลัก */
  muscles: readonly [Muscle, ...Muscle[]];
  equipment: string;
  /** จำนวนเซ็ต × ครั้ง (หรือวินาที) ที่แนะนำสำหรับคนทั่วไป */
  sets: string;
  /** วิธีทำสั้น ๆ หนึ่งประโยค */
  cue: string;
}

export const EXERCISES: readonly Exercise[] = [
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscles: ['upper-chest', 'shoulders'], equipment: 'ดัมเบล', sets: '3×10', cue: 'ปรับม้านั่ง 30° ดันดัมเบลขึ้นเข้าหากัน' },
  { id: 'incline-bench-press', name: 'Incline Bench Press', muscles: ['upper-chest', 'triceps', 'shoulders'], equipment: 'บาร์เบล', sets: '4×8', cue: 'ม้านั่งเอียง 30° ลดบาร์ลงแตะอกบน' },
  { id: 'low-cable-fly', name: 'Low-to-High Cable Fly', muscles: ['upper-chest'], equipment: 'เคเบิล', sets: '3×12', cue: 'ดึงเคเบิลจากต่ำขึ้นมาชนกันระดับคาง' },
  { id: 'bench-press', name: 'Bench Press', muscles: ['lower-chest', 'upper-chest', 'triceps'], equipment: 'บาร์เบล', sets: '4×8', cue: 'ลดบาร์ลงแตะกลางอก ดันขึ้นโดยสะบักชิดม้านั่ง' },
  { id: 'push-up', name: 'Push-up', muscles: ['lower-chest', 'upper-chest', 'triceps'], equipment: 'บอดี้เวท', sets: '3×12', cue: 'ลำตัวตรงเป็นแนวเดียว ลงจนอกเกือบแตะพื้น' },
  { id: 'decline-bench-press', name: 'Decline Bench Press', muscles: ['lower-chest', 'triceps'], equipment: 'บาร์เบล', sets: '4×8', cue: 'ม้านั่งเอียงหัวต่ำ ลดบาร์ลงแตะอกล่าง' },
  { id: 'chest-dip', name: 'Chest Dip', muscles: ['lower-chest', 'triceps'], equipment: 'บาร์คู่', sets: '3×10', cue: 'โน้มตัวไปหน้าเล็กน้อย ย่อลงจนศอก 90° แล้วดันขึ้น' },
  { id: 'cable-fly', name: 'High-to-Low Cable Fly', muscles: ['lower-chest'], equipment: 'เคเบิล', sets: '3×12', cue: 'ดึงเคเบิลจากสูงลงมาชนกันระดับสะดือ' },
  { id: 'shoulder-press', name: 'Dumbbell Shoulder Press', muscles: ['shoulders', 'triceps'], equipment: 'ดัมเบล', sets: '3×10', cue: 'ดันดัมเบลจากระดับหูขึ้นเหนือศีรษะ' },
  { id: 'lateral-raise', name: 'Lateral Raise', muscles: ['shoulders'], equipment: 'ดัมเบล', sets: '3×15', cue: 'ยกแขนออกด้านข้างถึงระดับไหล่ ลงช้า ๆ' },
  { id: 'front-raise', name: 'Front Raise', muscles: ['shoulders'], equipment: 'ดัมเบล', sets: '3×12', cue: 'ยกแขนตรงไปด้านหน้าถึงระดับไหล่' },
  { id: 'face-pull', name: 'Face Pull', muscles: ['rear-delts', 'upper-back'], equipment: 'เคเบิล', sets: '3×15', cue: 'ดึงเชือกเข้าหาหน้า กางศอกออก' },
  { id: 'reverse-fly', name: 'Reverse Fly', muscles: ['rear-delts', 'upper-back'], equipment: 'ดัมเบล', sets: '3×15', cue: 'ก้มตัว กางแขนออกด้านข้าง บีบสะบัก' },
  { id: 'bicep-curl', name: 'Bicep Curl', muscles: ['biceps'], equipment: 'ดัมเบล', sets: '3×12', cue: 'ศอกนิ่งข้างลำตัว งอแขนยกดัมเบลขึ้น' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscles: ['biceps', 'forearms'], equipment: 'ดัมเบล', sets: '3×12', cue: 'หันฝ่ามือเข้าหากัน งอแขนขึ้น' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscles: ['triceps'], equipment: 'เคเบิล', sets: '3×12', cue: 'ศอกชิดลำตัว กดเชือกลงจนแขนตึง' },
  { id: 'overhead-extension', name: 'Overhead Tricep Extension', muscles: ['triceps'], equipment: 'ดัมเบล', sets: '3×12', cue: 'ถือดัมเบลเหนือศีรษะ งอศอกลดลงหลังหัวแล้วเหยียดขึ้น' },
  { id: 'wrist-curl', name: 'Wrist Curl', muscles: ['forearms'], equipment: 'ดัมเบล', sets: '3×15', cue: 'วางแขนบนเข่า ม้วนข้อมือขึ้นลง' },
  { id: 'farmers-walk', name: "Farmer's Walk", muscles: ['forearms', 'traps'], equipment: 'ดัมเบล', sets: '3×30 ม.', cue: 'ถือดัมเบลหนักข้างลำตัว เดินตัวตรง' },
  { id: 'shrug', name: 'Dumbbell Shrug', muscles: ['traps'], equipment: 'ดัมเบล', sets: '3×15', cue: 'ยักไหล่ขึ้นหาหู ค้าง 1 วิ แล้วลงช้า ๆ' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscles: ['lats', 'biceps'], equipment: 'เคเบิล', sets: '4×10', cue: 'ดึงบาร์ลงถึงคาง บีบสะบักลง' },
  { id: 'pull-up', name: 'Pull-up', muscles: ['lats', 'biceps', 'upper-back'], equipment: 'บาร์', sets: '3×6', cue: 'ห้อยบาร์ ดึงตัวขึ้นจนคางพ้นบาร์' },
  { id: 'db-row', name: 'One-arm Dumbbell Row', muscles: ['lats', 'upper-back'], equipment: 'ดัมเบล', sets: '3×10', cue: 'เข่าและมือข้างหนึ่งวางบนม้านั่ง ดึงดัมเบลขึ้นข้างเอว' },
  { id: 'seated-row', name: 'Seated Cable Row', muscles: ['upper-back', 'lats'], equipment: 'เคเบิล', sets: '3×12', cue: 'หลังตรง ดึงด้ามเข้าหาท้อง ศอกชิดลำตัว' },
  { id: 'back-extension', name: 'Back Extension', muscles: ['lower-back', 'glutes'], equipment: 'เครื่อง', sets: '3×15', cue: 'ก้มลงช้า ๆ แล้วยกลำตัวขึ้นจนตรง ไม่แอ่นเกิน' },
  { id: 'bird-dog', name: 'Bird Dog', muscles: ['lower-back', 'middle-abs'], equipment: 'บอดี้เวท', sets: '3×10', cue: 'คลานสี่ขา เหยียดแขนและขาฝั่งตรงข้ามออกพร้อมกัน' },
  { id: 'crunch', name: 'Crunch', muscles: ['upper-abs'], equipment: 'บอดี้เวท', sets: '3×15', cue: 'ม้วนลำตัวส่วนบนขึ้น หลังล่างแนบพื้น' },
  { id: 'cable-crunch', name: 'Cable Crunch', muscles: ['upper-abs', 'middle-abs'], equipment: 'เคเบิล', sets: '3×12', cue: 'คุกเข่าหันหน้าเข้าเคเบิล ม้วนตัวลงให้ศอกเข้าหาเข่า' },
  { id: 'plank', name: 'Plank', muscles: ['middle-abs', 'lower-abs', 'obliques'], equipment: 'บอดี้เวท', sets: '3×45 วิ', cue: 'ศอกอยู่ใต้ไหล่ เกร็งท้อง สะโพกไม่ตก' },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', muscles: ['middle-abs', 'upper-abs', 'lower-abs'], equipment: 'ล้อ', sets: '3×10', cue: 'คุกเข่า ไถล้อออกไปข้างหน้าช้า ๆ เกร็งท้องไม่ให้หลังแอ่น' },
  { id: 'bicycle-crunch', name: 'Bicycle Crunch', muscles: ['middle-abs', 'obliques'], equipment: 'บอดี้เวท', sets: '3×20', cue: 'นอนหงาย ปั่นขาสลับ บิดศอกไปหาเข่าฝั่งตรงข้าม' },
  { id: 'leg-raise', name: 'Hanging Leg Raise', muscles: ['lower-abs'], equipment: 'บาร์', sets: '3×10', cue: 'ห้อยบาร์ ยกขาขึ้นช้า ๆ ไม่แกว่งตัว' },
  { id: 'reverse-crunch', name: 'Reverse Crunch', muscles: ['lower-abs'], equipment: 'บอดี้เวท', sets: '3×15', cue: 'นอนหงาย ม้วนสะโพกยกเข่าเข้าหาอก' },
  { id: 'flutter-kick', name: 'Flutter Kick', muscles: ['lower-abs'], equipment: 'บอดี้เวท', sets: '3×30 วิ', cue: 'นอนหงาย ยกขาเหนือพื้นเล็กน้อย เตะสลับขึ้นลงเร็ว ๆ' },
  { id: 'russian-twist', name: 'Russian Twist', muscles: ['obliques', 'middle-abs'], equipment: 'แผ่นน้ำหนัก', sets: '3×20', cue: 'เอนหลังเล็กน้อย บิดลำตัวซ้าย-ขวา' },
  { id: 'side-plank', name: 'Side Plank', muscles: ['obliques'], equipment: 'บอดี้เวท', sets: '3×30 วิ', cue: 'ตะแคงตัว ยันศอก ยกสะโพกให้ลำตัวตรง' },
  { id: 'hip-thrust', name: 'Hip Thrust', muscles: ['glutes', 'hamstrings'], equipment: 'บาร์เบล', sets: '4×12', cue: 'หลังพิงม้านั่ง ดันสะโพกขึ้นจนลำตัวขนานพื้น บีบก้น' },
  { id: 'glute-bridge', name: 'Glute Bridge', muscles: ['glutes'], equipment: 'บอดี้เวท', sets: '3×15', cue: 'นอนหงาย ชันเข่า ยกสะโพกขึ้นค้างไว้ 1 วิ' },
  { id: 'cable-kickback', name: 'Cable Kickback', muscles: ['glutes'], equipment: 'เคเบิล', sets: '3×12', cue: 'เตะขาไปด้านหลังตรง ๆ ลำตัวนิ่ง' },
  { id: 'squat', name: 'Back Squat', muscles: ['quads', 'glutes'], equipment: 'บาร์เบล', sets: '4×8', cue: 'ย่อลงจนต้นขาขนานพื้น เข่าไปทางเดียวกับปลายเท้า' },
  { id: 'leg-press', name: 'Leg Press', muscles: ['quads', 'glutes'], equipment: 'เครื่อง', sets: '3×12', cue: 'ดันแท่นด้วยส้นเท้า ไม่ล็อกเข่าตอนเหยียด' },
  { id: 'leg-extension', name: 'Leg Extension', muscles: ['quads'], equipment: 'เครื่อง', sets: '3×12', cue: 'เหยียดเข่าจนขาตรง เกร็งค้าง แล้วลงช้า ๆ' },
  { id: 'walking-lunge', name: 'Walking Lunge', muscles: ['quads', 'glutes'], equipment: 'ดัมเบล', sets: '3×12', cue: 'ก้าวยาว ย่อจนเข่าหลังเกือบแตะพื้น' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscles: ['hamstrings', 'glutes', 'lower-back'], equipment: 'บาร์เบล', sets: '3×10', cue: 'หลังตรง พับสะโพกลง รู้สึกตึงต้นขาด้านหลัง' },
  { id: 'leg-curl', name: 'Lying Leg Curl', muscles: ['hamstrings'], equipment: 'เครื่อง', sets: '3×12', cue: 'นอนคว่ำ งอเข่าดึงแท่นเข้าหาก้น' },
  { id: 'adductor-machine', name: 'Hip Adduction', muscles: ['adductors'], equipment: 'เครื่อง', sets: '3×15', cue: 'หนีบขาเข้าหากันช้า ๆ แล้วปล่อยออก' },
  { id: 'sumo-squat', name: 'Sumo Squat', muscles: ['adductors', 'glutes', 'quads'], equipment: 'ดัมเบล', sets: '3×12', cue: 'กางขากว้าง ปลายเท้าชี้ออก ย่อตัวตรง ๆ' },
  { id: 'calf-raise', name: 'Standing Calf Raise', muscles: ['calves'], equipment: 'เครื่อง', sets: '3×15', cue: 'เขย่งปลายเท้าสุด ค้างไว้แล้วลงช้า ๆ' },
  { id: 'seated-calf-raise', name: 'Seated Calf Raise', muscles: ['calves'], equipment: 'เครื่อง', sets: '3×15', cue: 'นั่ง วางเข่าใต้แท่น เขย่งส้นเท้าขึ้นลง' },
];

const BY_ID = new Map(EXERCISES.map(e => [e.id, e]));

export function findExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

/** ท่าที่ได้กล้ามเนื้อที่เลือก — ท่าที่มีมัดที่เลือกเป็นเป้าหลักขึ้นก่อน */
export function exercisesFor(muscles: readonly Muscle[]): Exercise[] {
  const main = EXERCISES.filter(e => muscles.includes(e.muscles[0]));
  const assist = EXERCISES.filter(e => !muscles.includes(e.muscles[0]) && e.muscles.some(m => muscles.includes(m)));
  return [...main, ...assist];
}
