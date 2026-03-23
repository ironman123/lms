export const subjects = [
  "maths",
  "language",
  "science",
  "history",
  "coding",
  "economics",
];

export const colors = {
  science: "#E5D0FF",
  maths: "#FFDA6E",
  language: "#BDE7FF",
  coding: "#FFC8E4",
  history: "#FFECC8",
  economics: "#C8FFDF",
};

export const voices = {
  male: { casual: "2BJW5coyhAzSr8STdHbE", formal: "c6SfcYrb2t09NHXiT80T" },
  female: { casual: "ZIlrSGI4jZqobxRKprJz", formal: "sarah" },
};

export const recentSessions = [
  {
    id: "1",
    subject: "science",
    name: "Neura the Brainy Explorer",
    topic: "Neural Network of the Brain",
    duration: 45,
    color: "#E5D0FF",
  },
  {
    id: "2",
    subject: "maths",
    name: "Countsy the Number Wizard",
    topic: "Derivatives & Integrals",
    duration: 30,
    color: "#FFDA6E",
  },
  {
    id: "3",
    subject: "language",
    name: "Verba the Vocabulary Builder",
    topic: "English Literature",
    duration: 30,
    color: "#BDE7FF",
  },
  {
    id: "4",
    subject: "coding",
    name: "Codey the Logic Hacker",
    topic: "Intro to If-Else Statements",
    duration: 45,
    color: "#FFC8E4",
  },
  {
    id: "5",
    subject: "history",
    name: "Memo, the Memory Keeper",
    topic: "World Wars: Causes & Consequences",
    duration: 15,
    color: "#FFECC8",
  },
  {
    id: "6",
    subject: "economics",
    name: "The Market Maestro",
    topic: "The Basics of Supply & Demand",
    duration: 10,
    color: "#C8FFDF",
  },
];

export const exams = [
  {
    $id: "123",
    name: "Kerala PSC General",
    description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, voluptate.",
    tags: ["Engineering", "National Level"],
    duration: 180,
    totalMarks: 300,
    //year: 2023,
    color: "#FFDA6E",
    syllabus: [
      {
        category: "Mathematics",
        topics: ["Algebra", "Calculus", "Geometry"]
      },
      {
        category: "Physics",
        topics: ["Mechanics", "Thermodynamics", "Electromagnetism"]
      },
      {
        category: "Chemistry",
        topics: ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry"]
      },
    ]
  },
  {
    $id: "456",
    name: "Kerala Teaching",
    description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, voluptate.",
    tags: ["Medical", "National Level"],
    duration: 180,
    totalMarks: 720,
    //year: 2024,
    color: "#e5d0ff",
    syllabus: [
      {
        category: "Biology",
        topics: ["Botany", "Zoology", "Human Physiology"]
      },
      {
        category: "Chemistry",
        topics: ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry"]
      },
      {
        category: "Physics",
        topics: ["Mechanics", "Thermodynamics", "Electromagnetism"]
      },
    ]
  },
  {
    $id: "789",
    name: "Kerala Technical",
    description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, voluptate.",
    tags: ["Engineering", "National Level"],
    duration: 180,
    totalMarks: 1000,
    //year: 2022,
    color: "#BDE7FF",
    syllabus: [
      {
        category: "General Aptitude",
        topics: ["Verbal Ability", "Numerical Ability"]
      },
      {
        category: "Engineering Mathematics",
        topics: ["Linear Algebra", "Calculus", "Probability"]
      },
      {
        category: "Computer Science",
        topics: ["Data Structures", "Algorithms", "Operating Systems"]
      },
    ]
  }
];

export const examsData = [
  { id: 1, title: "2024 Session 1", type: "PYQ", year: "2024", duration: 180 },
  { id: 2, title: "Full Syllabus Mock 1", type: "Mock", year: "2024", duration: 180 },
  { id: 3, title: "2023 Shift 2", type: "PYQ", year: "2023", duration: 180 },
  { id: 4, title: "Chapter-wise: Mechanics", type: "Topic", year: "N/A", duration: 60 },
];

export const KPSC_CATEGORIES = [
  {
    id: "general",
    name: "General",
    description: "Administrative and ministerial positions across various Kerala State departments.",
    examCount: 42,
    // Using Lucide-style naming or paths to clean SVGs
    icon: "Briefcase",
    image: "/images/adnan-saifee-zmr9TeA7WjU-unsplash.jpg",
    color: "#0F172A", // Slate 900 (Professional Navy)
  },
  {
    id: "teaching",
    name: "Teaching",
    description: "Academic roles within the General Education and Higher Secondary departments.",
    examCount: 28,
    icon: "GraduationCap",
    image: "/images/fsd-foundation-for-sustainable-development-sJq6t8KvooA-unsplash.jpg",
    color: "#334155", // Slate 700
  },
  {
    id: "technical",
    name: "Technical",
    description: "Specialized engineering, polytechnic, and vocational instructor services.",
    examCount: 15,
    icon: "Cpu",
    image: "/images/melech-charly-nO7dcpGmdIw-unsplash.jpg",
    color: "#475569", // Slate 600
  },
];

export const DUMMY_EXAMS = [
  // --- GENERAL CATEGORY ---
  {
    id: "ldc-2024",
    categoryId: "general",
    name: "LDC (Clerk)",
    description: "Lower Division Clerk for various departments like Secretariat, Revenue, and more. Requires 10th pass qualification.",
    tags: ["10th Level", "General"],
    duration: 75,
    totalMarks: 100,
    color: "#0F172A",
    // ADD THIS:
    syllabus: [
      {
        category: "General Knowledge",
        topics: ["Current Affairs", "Indian Constitution", "Kerala Renaissance"]
      },
      {
        category: "Simple Arithmetic",
        topics: ["Fractions", "Percentages", "Time and Work"]
      }
    ]
  },
  {
    id: "lp-up-assistant",
    categoryId: "general",
    name: "LP/UP Assistant",
    description: "Assistant teacher positions in Lower Primary and Upper Primary schools across the state.",
    tags: ["Degree", "General"],
    duration: 90,
    totalMarks: 100,
    color: "#0F172A",
  },
  {
    id: "fire-driver",
    categoryId: "general",
    name: "Fire & Rescue Driver",
    description: "Driver-cum-Pump Operator positions in the Kerala Fire and Rescue Services department.",
    tags: ["10th Level", "Technical-Lite"],
    duration: 75,
    totalMarks: 100,
    color: "#0F172A",
  },

  // --- TEACHING CATEGORY ---
  {
    id: "hsst-physics",
    categoryId: "teaching",
    name: "HSST Physics",
    description: "Higher Secondary School Teacher for Physics. Requires PG and B.Ed with SET qualification.",
    tags: ["PG Level", "Academic"],
    duration: 90,
    totalMarks: 100,
    color: "#334155",
  },
  {
    id: "ktet-category-3",
    categoryId: "teaching",
    name: "K-TET Category III",
    description: "Kerala Teacher Eligibility Test for High School classes (VIII to X).",
    tags: ["Eligibility", "Teaching"],
    duration: 150,
    totalMarks: 150,
    color: "#334155",
  },
  {
    id: "set-2024",
    categoryId: "teaching",
    name: "State Eligibility Test",
    description: "Mandatory qualification for appointment as Higher Secondary School Teachers in Kerala.",
    tags: ["PG Level", "SET"],
    duration: 120,
    totalMarks: 120,
    color: "#334155",
  },

  // --- TECHNICAL CATEGORY ---
  {
    id: "lsgd-overseer",
    categoryId: "technical",
    name: "LSGD Overseer Gr. III",
    description: "Overseer/Draftsman Grade III positions in the Local Self Government Department.",
    tags: ["Diploma", "Civil"],
    duration: 75,
    totalMarks: 100,
    color: "#475569",
  },
  {
    id: "ieo-2024",
    categoryId: "technical",
    name: "Industries Extension Officer",
    description: "Officer positions in the Industries and Commerce Department requiring an Engineering degree.",
    tags: ["B.Tech", "Engineering"],
    duration: 90,
    totalMarks: 100,
    color: "#475569",
  },
  {
    id: "junior-instructor",
    categoryId: "technical",
    name: "Junior Instructor (ITI)",
    description: "Instructor positions in various trades for Industrial Training Institutes (ITI).",
    tags: ["ITI/Diploma", "Technical"],
    duration: 75,
    totalMarks: 100,
    color: "#475569",
  },
];