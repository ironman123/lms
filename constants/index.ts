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
    name: "JEE Mains",
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
    name: "NEET",
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
    name: "GATE CSE",
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