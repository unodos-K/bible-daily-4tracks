const fs = require('fs');

// Fix useBibleReader.ts
let useBible = fs.readFileSync('src/hooks/useBibleReader.ts', 'utf8');
useBible = useBible.replace(
  /<<<<<<< HEAD\n  saveDayRecord, updateReadRecordOneVerse, updateMemorizeRecord,\n  saveViewerDay, getSavedViewerDay \n=======\n  saveDayRecord, updateReadRecordOneVerse, updateMemorizeRecord, getTodayReadCount,\n  saveViewerDay, getSavedViewerDay, saveReadingSettings\n>>>>>>> [a-f0-9]+\n/g,
  '  saveDayRecord, updateReadRecordOneVerse, updateMemorizeRecord,\n  saveViewerDay, getSavedViewerDay, saveReadingSettings\n'
);
fs.writeFileSync('src/hooks/useBibleReader.ts', useBible);

// Fix VerseInteractionModals.tsx
let modals = fs.readFileSync('src/components/read/VerseInteractionModals.tsx', 'utf8');
modals = modals.replace(
  /<<<<<<< HEAD\nimport { AlertCircle, Bookmark, X, CheckCircle2, Heart } from "lucide-react";\nimport { OneVerse } from "@\/lib\/storage";\n=======\nimport { AlertCircle, Leaf, Bookmark, X, CheckCircle2, Heart, Footprints } from "lucide-react";\nimport { OneVerse, ReadRecordsMap } from "@\/lib\/storage";\n>>>>>>> [a-f0-9]+\n/g,
  'import { AlertCircle, Bookmark, X, CheckCircle2, Heart, Footprints } from "lucide-react";\nimport { OneVerse } from "@/lib/storage";\n'
);
modals = modals.replace(
  /<<<<<<< HEAD\n=======\n  setDayIndex: \(day: number\) => void;\n  dayIndex: number;\n  getNextUnreadDay: \(records: ReadRecordsMap\) => number;\n  records: ReadRecordsMap;\n>>>>>>> [a-f0-9]+\n/g,
  '  dayIndex: number;\n'
);
modals = modals.replace(
  /<<<<<<< HEAD\n  setIsMemoryModalOpen\n=======\n  setIsMemoryModalOpen,\n  setDayIndex,\n  dayIndex,\n  getNextUnreadDay,\n  records\n>>>>>>> [a-f0-9]+\n/g,
  '  setIsMemoryModalOpen,\n  dayIndex\n'
);
fs.writeFileSync('src/components/read/VerseInteractionModals.tsx', modals);

// Fix page.tsx
let page = fs.readFileSync('src/app/read/page.tsx', 'utf8');
page = page.replace(
  /<<<<<<< HEAD\n=======\n        setDayIndex={setDayIndex}\n        dayIndex={dayIndex}\n        getNextUnreadDay={getNextUnreadDay}\n        records={records}\n>>>>>>> [a-f0-9]+\n/g,
  '        dayIndex={dayIndex}\n'
);
fs.writeFileSync('src/app/read/page.tsx', page);
