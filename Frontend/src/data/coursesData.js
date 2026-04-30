// src/data/coursesData.js
export const coursesData = {
  faculties: [
    { id: 'FICT', name: 'Faculty of Information Communication Technology', icon: 'cpu', color: '#4CAF50' },
    { id: 'FAMD', name: 'Faculty of Business and Entrepreneurship', icon: 'briefcase', color: '#2196F3' },
  ],
  
  courses: [
    // FICT Courses (3 courses)
    { id: 'C001', name: 'Programming 1', code: 'DIPL1112', faculty: 'FICT', credits: 3, stream: 'ICT' },
    { id: 'C002', name: 'Web Development', code: 'WEB201', faculty: 'FICT', credits: 4, stream: 'ICT' },
    { id: 'C003', name: 'Database Systems', code: 'DB201', faculty: 'FICT', credits: 4, stream: 'ICT' },
    // FAMD Courses (3 courses)
    { id: 'C004', name: 'Business Management', code: 'BMGT101', faculty: 'FAMD', credits: 3, stream: 'Business' },
    { id: 'C005', name: 'Business Communication', code: 'COMM101', faculty: 'FAMD', credits: 2, stream: 'Business' },
    { id: 'C006', name: 'Entrepreneurship', code: 'ENT101', faculty: 'FAMD', credits: 2, stream: 'Business' },
  ],
  
  modules: [
    // Programming 1 Modules (5 modules)
    { id: 'M001', name: 'Introduction to Programming', courseId: 'C001', code: 'PROG101', credits: 3 },
    { id: 'M002', name: 'Variables and Data Types', courseId: 'C001', code: 'PROG102', credits: 2 },
    { id: 'M003', name: 'Control Structures', courseId: 'C001', code: 'PROG103', credits: 3 },
    { id: 'M004', name: 'Functions and Methods', courseId: 'C001', code: 'PROG104', credits: 2 },
    { id: 'M005', name: 'Arrays and Collections', courseId: 'C001', code: 'PROG105', credits: 3 },
    // Web Development Modules (5 modules)
    { id: 'M006', name: 'HTML & CSS Basics', courseId: 'C002', code: 'WEB102', credits: 3 },
    { id: 'M007', name: 'JavaScript Fundamentals', courseId: 'C002', code: 'WEB103', credits: 3 },
    { id: 'M008', name: 'React Basics', courseId: 'C002', code: 'WEB104', credits: 3 },
    { id: 'M009', name: 'Node.js Basics', courseId: 'C002', code: 'WEB105', credits: 3 },
    { id: 'M010', name: 'Database Integration', courseId: 'C002', code: 'WEB106', credits: 3 },
    // Database Systems Modules (5 modules)
    { id: 'M011', name: 'SQL Fundamentals', courseId: 'C003', code: 'DB102', credits: 3 },
    { id: 'M012', name: 'Database Design', courseId: 'C003', code: 'DB103', credits: 3 },
    { id: 'M013', name: 'Normalization', courseId: 'C003', code: 'DB104', credits: 2 },
    { id: 'M014', name: 'Transactions and Concurrency', courseId: 'C003', code: 'DB105', credits: 3 },
    { id: 'M015', name: 'NoSQL Databases', courseId: 'C003', code: 'DB106', credits: 3 },
  ],
};

export const timetableData = {
  monday: [
    { time: '08:30-10:30', course: 'Programming 1', courseId: 'C001', room: 'MM3', faculty: 'FICT' },
    { time: '10:30-12:30', course: 'Web Development', courseId: 'C002', room: 'Net Lab', faculty: 'FICT' },
    { time: '12:30-14:30', course: 'Database Systems', courseId: 'C003', room: 'MM2', faculty: 'FICT' },
    { time: '14:30-16:30', course: 'Business Management', courseId: 'C004', room: 'Hall 6', faculty: 'FAMD' },
  ],
  tuesday: [
    { time: '08:30-10:30', course: 'Database Systems', courseId: 'C003', room: 'Net Lab', faculty: 'FICT' },
    { time: '10:30-12:30', course: 'Programming 1', courseId: 'C001', room: 'MM4', faculty: 'FICT' },
    { time: '12:30-14:30', course: 'Web Development', courseId: 'C002', room: 'MM3', faculty: 'FICT' },
    { time: '14:30-16:30', course: 'Business Communication', courseId: 'C005', room: 'Hall 6', faculty: 'FAMD' },
  ],
  wednesday: [
    { time: '08:30-10:30', course: 'Business Management', courseId: 'C004', room: 'Hall 9', faculty: 'FAMD' },
    { time: '10:30-12:30', course: 'Programming 1', courseId: 'C001', room: 'MM7', faculty: 'FICT' },
    { time: '12:30-14:30', course: 'Database Systems', courseId: 'C003', room: 'MM3', faculty: 'FICT' },
    { time: '14:30-16:30', course: 'Entrepreneurship', courseId: 'C006', room: 'Hall 6', faculty: 'FAMD' },
  ],
  thursday: [
    { time: '08:30-10:30', course: 'Web Development', courseId: 'C002', room: 'MM2', faculty: 'FICT' },
    { time: '10:30-12:30', course: 'Business Communication', courseId: 'C005', room: 'MM3', faculty: 'FAMD' },
    { time: '12:30-14:30', course: 'Programming 1', courseId: 'C001', room: 'MM1', faculty: 'FICT' },
    { time: '14:30-16:30', course: 'Database Systems', courseId: 'C003', room: 'MM4', faculty: 'FICT' },
  ],
  friday: [
    { time: '08:30-10:30', course: 'Programming 1', courseId: 'C001', room: 'MM1', faculty: 'FICT' },
    { time: '10:30-12:30', course: 'Web Development', courseId: 'C002', room: 'MM3', faculty: 'FICT' },
    { time: '12:30-14:30', course: 'Business Management', courseId: 'C004', room: 'Hall 2', faculty: 'FAMD' },
    { time: '14:30-16:30', course: 'Business Communication', courseId: 'C005', room: 'Hall 6', faculty: 'FAMD' },
  ],
};

// Helper function to get courses by faculty
export const getCoursesByFaculty = (facultyId) => {
  return coursesData.courses.filter(course => course.faculty === facultyId);
};

// Helper function to get modules by course
export const getModulesByCourse = (courseId) => {
  return coursesData.modules.filter(module => module.courseId === courseId);
};

// Helper function to get course by ID
export const getCourseById = (courseId) => {
  return coursesData.courses.find(course => course.id === courseId);
};