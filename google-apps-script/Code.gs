/**
 * AMS QR — VTU Attendance System
 * Google Apps Script Backend (acts as REST API for the React frontend)
 * 
 * SETUP:
 * 1. Create a Google Sheet with these tabs: Users, Sessions, Attendance, Subjects, Timetable, Rooms
 * 2. Copy the Sheet ID from the URL (the long string between /d/ and /edit)
 * 3. Paste it in SHEET_ID below
 * 4. Deploy this script as a Web App: Deploy > New Deployment > Web App > "Anyone" access
 * 5. Copy the deployment URL into your React app's .env.local as VITE_APPS_SCRIPT_URL
 */

// ============================================================
// CONFIGURATION — UPDATE THIS WITH YOUR GOOGLE SHEET ID
// ============================================================
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';

// ============================================================
// HELPERS
// ============================================================

function getSheet(tabName) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(tabName);
}

function sheetToJSON(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function generateToken() {
  return 'TKN_' + Utilities.getUuid().replace(/-/g, '').substring(0, 12);
}

function generateId() {
  return 'id_' + Utilities.getUuid().replace(/-/g, '').substring(0, 10);
}

// ============================================================
// GET HANDLER (doGet)
// ============================================================

function doGet(e) {
  try {
    const action = e.parameter.action;

    switch (action) {
      case 'login':
        return handleLogin(e.parameter);
      case 'getActiveSession':
        return handleGetActiveSession(e.parameter);
      case 'getTimetable':
        return handleGetTimetable(e.parameter);
      case 'getAttendanceLogs':
        return handleGetAttendanceLogs(e.parameter);
      case 'getStudentStats':
        return handleGetStudentStats(e.parameter);
      case 'getAdminStats':
        return handleGetAdminStats();
      case 'getRooms':
        return handleGetRooms();
      case 'getStudentHistory':
        return handleGetStudentHistory(e.parameter);
      case 'getAllStudents':
        return handleGetAllStudents();
      case 'getFacultyRecords':
        return handleGetFacultyRecords(e.parameter);
      case 'seedData':
        seedData();
        return jsonResponse({ success: true, message: 'Seed data created successfully' });
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================================
// POST HANDLER (doPost)
// ============================================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    switch (action) {
      case 'createSession':
        return handleCreateSession(body);
      case 'rotateToken':
        return handleRotateToken(body);
      case 'endSession':
        return handleEndSession(body);
      case 'markAttendance':
        return handleMarkAttendance(body);
      case 'addClass':
        return handleAddClass(body);
      default:
        return jsonResponse({ success: false, error: 'Unknown POST action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================================
// AUTH
// ============================================================

function handleLogin(params) {
  const { userId, password } = params;
  const sheet = getSheet('Users');
  const users = sheetToJSON(sheet);

  const user = users.find(u => 
    (u.USN === userId || u.Email === userId) && String(u.Password) === String(password)
  );

  if (!user) {
    return jsonResponse({ success: false, error: 'Invalid credentials' });
  }

  return jsonResponse({
    success: true,
    user: {
      id: user.USN || user.Email,
      name: user.Name,
      role: user.Role,
      email: user.Email,
      usn: user.USN || '',
      semester: user.Semester || '',
      section: user.Section || '',
      department: user.Department || '',
      avatarInitials: user.Name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    }
  });
}

// ============================================================
// SESSIONS
// ============================================================

function handleCreateSession(body) {
  const sheet = getSheet('Sessions');
  const sessionId = generateId();
  const token = generateToken();
  const now = new Date();

  // body: { facultyId, subjectCode, subjectName, room, section, endTime }
  sheet.appendRow([
    sessionId,
    body.facultyId,
    body.subjectCode,
    body.subjectName,
    body.room,
    body.section || '',
    token,
    now.toISOString(),
    body.endTime || '',
    'ONGOING',
    body.lat || '',
    body.lng || ''
  ]);

  return jsonResponse({
    success: true,
    session: {
      sessionId: sessionId,
      token: token,
      startTime: now.toISOString(),
      status: 'ONGOING'
    }
  });
}

function handleGetActiveSession(params) {
  const sheet = getSheet('Sessions');
  const sessions = sheetToJSON(sheet);

  // Find all ONGOING sessions, optionally filter by facultyId
  let activeSessions = sessions.filter(s => s.Status === 'ONGOING');
  
  if (params.facultyId) {
    activeSessions = activeSessions.filter(s => s.FacultyID === params.facultyId);
  }

  if (params.sessionId) {
    activeSessions = activeSessions.filter(s => s.SessionID === params.sessionId);
  }

  return jsonResponse({
    success: true,
    sessions: activeSessions.map(s => ({
      sessionId: s.SessionID,
      facultyId: s.FacultyID,
      subjectCode: s.SubjectCode,
      subjectName: s.SubjectName,
      room: s.Room,
      section: s.Section,
      token: s.Token,
      startTime: s.StartTime,
      endTime: s.EndTime,
      status: s.Status,
      lat: s.Lat,
      lng: s.Lng
    }))
  });
}

function handleRotateToken(body) {
  const sheet = getSheet('Sessions');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const sessionIdCol = headers.indexOf('SessionID');
  const tokenCol = headers.indexOf('Token');

  const newToken = generateToken();

  for (let i = 1; i < data.length; i++) {
    if (data[i][sessionIdCol] === body.sessionId) {
      sheet.getRange(i + 1, tokenCol + 1).setValue(newToken);
      return jsonResponse({ success: true, token: newToken });
    }
  }

  return jsonResponse({ success: false, error: 'Session not found' });
}

function handleEndSession(body) {
  const sheet = getSheet('Sessions');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const sessionIdCol = headers.indexOf('SessionID');
  const statusCol = headers.indexOf('Status');

  for (let i = 1; i < data.length; i++) {
    if (data[i][sessionIdCol] === body.sessionId) {
      sheet.getRange(i + 1, statusCol + 1).setValue('COMPLETED');
      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ success: false, error: 'Session not found' });
}

// ============================================================
// ATTENDANCE
// ============================================================

function handleMarkAttendance(body) {
  // body: { usn, studentName, sessionId, token, gpsLat, gpsLng }
  
  // 1. Validate session exists and is ONGOING
  const sessSheet = getSheet('Sessions');
  const sessions = sheetToJSON(sessSheet);
  const session = sessions.find(s => s.SessionID === body.sessionId && s.Status === 'ONGOING');

  if (!session) {
    return jsonResponse({ success: false, error: 'No active session found', code: 'SESSION_EXPIRED' });
  }

  // 2. Validate token matches
  if (session.Token !== body.token) {
    return jsonResponse({ success: false, error: 'QR code has expired or is invalid', code: 'INVALID_TOKEN' });
  }

  // 3. Check for duplicate scan
  const attSheet = getSheet('Attendance');
  const records = sheetToJSON(attSheet);
  const duplicate = records.find(r => r.USN === body.usn && r.SessionID === body.sessionId);

  if (duplicate) {
    return jsonResponse({ success: false, error: 'You have already marked attendance for this session', code: 'DUPLICATE' });
  }

  // 4. GPS geofencing check (server-side validation)
  if (session.Lat && session.Lng && body.gpsLat && body.gpsLng) {
    const distance = haversineDistance(
      parseFloat(body.gpsLat), parseFloat(body.gpsLng),
      parseFloat(session.Lat), parseFloat(session.Lng)
    );

    // Get room radius (default 100 meters)
    const roomsSheet = getSheet('Rooms');
    const rooms = sheetToJSON(roomsSheet);
    const room = rooms.find(r => r.RoomName === session.Room);
    const maxRadius = room ? parseFloat(room.RadiusMeters) : 100;

    if (distance > maxRadius) {
      return jsonResponse({ 
        success: false, 
        error: 'You are ' + Math.round(distance) + 'm away from the classroom (max: ' + maxRadius + 'm)', 
        code: 'GPS_FAIL',
        distance: Math.round(distance)
      });
    }
  }

  // 5. Mark attendance
  const now = new Date();
  attSheet.appendRow([
    body.usn,
    body.studentName,
    body.sessionId,
    session.SubjectCode || '',
    session.SubjectName || '',
    now.toISOString(),
    body.gpsLat || '',
    body.gpsLng || '',
    'PRESENT'
  ]);

  return jsonResponse({ 
    success: true, 
    message: 'Attendance marked successfully',
    subjectName: session.SubjectName
  });
}

function handleGetAttendanceLogs(params) {
  const sheet = getSheet('Attendance');
  const records = sheetToJSON(sheet);

  const filtered = records.filter(r => r.SessionID === params.sessionId);

  return jsonResponse({
    success: true,
    logs: filtered.map(r => ({
      usn: r.USN,
      studentName: r.StudentName,
      timestamp: r.Timestamp,
      status: r.VerifyStatus || 'PRESENT'
    }))
  });
}

function handleGetStudentStats(params) {
  const attSheet = getSheet('Attendance');
  const records = sheetToJSON(attSheet);
  const sessSheet = getSheet('Sessions');
  const sessions = sheetToJSON(sessSheet);

  // Only count COMPLETED sessions for stats
  const completedSessions = sessions.filter(s => s.Status === 'COMPLETED');

  // Group by subject
  const subjectMap = {};

  completedSessions.forEach(s => {
    const key = s.SubjectCode;
    if (!subjectMap[key]) {
      subjectMap[key] = {
        subjectCode: s.SubjectCode,
        subjectName: s.SubjectName,
        totalClasses: 0,
        attendedClasses: 0
      };
    }
    subjectMap[key].totalClasses++;

    // Check if this student attended this session
    const attended = records.find(r => r.USN === params.usn && r.SessionID === s.SessionID);
    if (attended) {
      subjectMap[key].attendedClasses++;
    }
  });

  const stats = Object.values(subjectMap).map(s => ({
    ...s,
    percentage: s.totalClasses > 0 ? Math.round((s.attendedClasses / s.totalClasses) * 1000) / 10 : 0
  }));

  // Compute overall
  const totalClasses = stats.reduce((sum, s) => sum + s.totalClasses, 0);
  const totalAttended = stats.reduce((sum, s) => sum + s.attendedClasses, 0);
  const overall = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 1000) / 10 : 0;

  return jsonResponse({
    success: true,
    stats: stats,
    overall: overall
  });
}

function handleGetStudentHistory(params) {
  const sheet = getSheet('Attendance');
  const records = sheetToJSON(sheet);

  const filtered = records
    .filter(r => r.USN === params.usn)
    .map(r => ({
      subjectCode: r.SubjectCode,
      subjectName: r.SubjectName,
      date: r.Timestamp,
      status: r.VerifyStatus || 'PRESENT'
    }))
    .reverse(); // newest first

  return jsonResponse({ success: true, history: filtered });
}

// ============================================================
// ADMIN
// ============================================================

function handleGetAdminStats() {
  const usersSheet = getSheet('Users');
  const users = sheetToJSON(usersSheet);
  const sessSheet = getSheet('Sessions');
  const sessions = sheetToJSON(sessSheet);
  const attSheet = getSheet('Attendance');
  const records = sheetToJSON(attSheet);
  const subjectsSheet = getSheet('Subjects');
  const subjects = sheetToJSON(subjectsSheet);

  const students = users.filter(u => u.Role === 'STUDENT');
  const faculty = users.filter(u => u.Role === 'FACULTY');
  const activeSessions = sessions.filter(s => s.Status === 'ONGOING');

  // Compute per-student overall attendance
  const completedSessions = sessions.filter(s => s.Status === 'COMPLETED');
  const lowAttendance = [];

  students.forEach(st => {
    const totalSessions = completedSessions.length;
    const attended = records.filter(r => r.USN === st.USN).length;
    const pct = totalSessions > 0 ? Math.round((attended / totalSessions) * 1000) / 10 : 100;

    if (pct < 85) {
      lowAttendance.push({
        usn: st.USN,
        name: st.Name,
        email: st.Email,
        attendance: pct
      });
    }
  });

  return jsonResponse({
    success: true,
    totalStudents: students.length,
    totalFaculty: faculty.length,
    totalSubjects: subjects.length,
    activeClasses: activeSessions.length,
    lowAttendance: lowAttendance,
    todayAttendance: records.length
  });
}

function handleGetAllStudents() {
  const sheet = getSheet('Users');
  const users = sheetToJSON(sheet);
  const students = users.filter(u => u.Role === 'STUDENT');

  return jsonResponse({
    success: true,
    students: students.map(s => ({
      usn: s.USN,
      name: s.Name,
      email: s.Email,
      section: s.Section,
      semester: s.Semester
    }))
  });
}

// ============================================================
// TIMETABLE
// ============================================================

function handleGetTimetable(params) {
  const sheet = getSheet('Timetable');
  const timetable = sheetToJSON(sheet);

  let filtered = timetable;
  if (params.facultyId) {
    filtered = timetable.filter(t => t.FacultyID === params.facultyId);
  }
  if (params.day) {
    filtered = filtered.filter(t => t.Day === params.day);
  }

  // Check if sessions are active for these timetable entries and update status
  const sessSheet = getSheet('Sessions');
  const sessions = sheetToJSON(sessSheet);

  const enriched = filtered.map(t => {
    const activeSession = sessions.find(s => 
      s.SubjectCode === t.SubjectCode && s.Status === 'ONGOING'
    );
    return {
      id: t.ID || (t.Day + '_' + t.StartTime + '_' + t.SubjectCode),
      day: t.Day,
      startTime: t.StartTime,
      endTime: t.EndTime,
      subjectCode: t.SubjectCode,
      subjectName: t.SubjectName || '',
      facultyId: t.FacultyID,
      section: t.Section,
      room: t.Room,
      status: activeSession ? 'ONGOING' : (t.Status || 'UPCOMING'),
      sessionId: activeSession ? activeSession.SessionID : null
    };
  });

  return jsonResponse({ success: true, timetable: enriched });
}

function handleAddClass(body) {
  const sheet = getSheet('Timetable');
  const id = generateId();

  sheet.appendRow([
    id,
    body.day || getDayName(),
    body.startTime,
    body.endTime,
    body.subjectCode,
    body.subjectName || '',
    body.facultyId,
    body.section || '',
    body.room || 'LH-101',
    'UPCOMING'
  ]);

  return jsonResponse({ success: true, id: id });
}

// ============================================================
// ROOMS
// ============================================================

function handleGetRooms() {
  const sheet = getSheet('Rooms');
  const rooms = sheetToJSON(sheet);

  return jsonResponse({
    success: true,
    rooms: rooms.map(r => ({
      name: r.RoomName,
      lat: parseFloat(r.Latitude) || 0,
      lng: parseFloat(r.Longitude) || 0,
      radius: parseFloat(r.RadiusMeters) || 100
    }))
  });
}

function handleGetFacultyRecords(params) {
  const sessSheet = getSheet('Sessions');
  const sessions = sheetToJSON(sessSheet);
  const attSheet = getSheet('Attendance');
  const records = sheetToJSON(attSheet);

  let facultySessions = sessions;
  if (params.facultyId) {
    facultySessions = sessions.filter(s => s.FacultyID === params.facultyId);
  }

  const result = facultySessions.map(s => {
    const sessionRecords = records.filter(r => r.SessionID === s.SessionID);
    return {
      sessionId: s.SessionID,
      subjectCode: s.SubjectCode,
      subjectName: s.SubjectName,
      room: s.Room,
      date: s.StartTime,
      status: s.Status,
      presentCount: sessionRecords.length,
      students: sessionRecords.map(r => ({
        usn: r.USN,
        name: r.StudentName,
        time: r.Timestamp
      }))
    };
  });

  return jsonResponse({ success: true, records: result });
}

// ============================================================
// UTILITY
// ============================================================

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in meters
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function getDayName() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

// ============================================================
// SEED DATA — Run this function ONCE to populate the sheet
// ============================================================

function seedData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // --- Users Tab ---
  let sheet = ss.getSheetByName('Users');
  if (!sheet) sheet = ss.insertSheet('Users');
  sheet.clear();
  sheet.appendRow(['USN', 'Name', 'Role', 'Email', 'Password', 'Section', 'Semester', 'Department']);
  // Admin
  sheet.appendRow(['ADM001', 'Admin User', 'ADMIN', 'admin@vtu.ac.in', 'admin123', '', '', 'Admin']);
  // Faculty
  sheet.appendRow(['FAC001', 'Prof. Harshitha', 'FACULTY', 'harshitha@vtu.ac.in', 'faculty123', '', '', 'CSE']);
  sheet.appendRow(['FAC002', 'Dr. Ramesh', 'FACULTY', 'ramesh@vtu.ac.in', 'faculty123', '', '', 'CSE']);
  // Students
  sheet.appendRow(['4PM21CS001', 'Asha Bhat', 'STUDENT', 'asha@vtu.edu', 'student123', 'A', 6, 'CSE']);
  sheet.appendRow(['4PM21CS010', 'Ravi Kumar', 'STUDENT', 'ravi@vtu.edu', 'student123', 'A', 6, 'CSE']);
  sheet.appendRow(['4PM21CS015', 'Sneha P', 'STUDENT', 'sneha@vtu.edu', 'student123', 'B', 6, 'CSE']);
  sheet.appendRow(['4PM21CS020', 'Arjun Nair', 'STUDENT', 'arjun@vtu.edu', 'student123', 'A', 6, 'CSE']);
  sheet.appendRow(['4PM21CS025', 'Kavya Sharma', 'STUDENT', 'kavya@vtu.edu', 'student123', 'B', 6, 'CSE']);

  // --- Subjects Tab ---
  sheet = ss.getSheetByName('Subjects');
  if (!sheet) sheet = ss.insertSheet('Subjects');
  sheet.clear();
  sheet.appendRow(['Code', 'Name', 'Semester', 'FacultyID']);
  sheet.appendRow(['18CS61', 'System Software', 6, 'FAC001']);
  sheet.appendRow(['18CS62', 'Computer Graphics', 6, 'FAC002']);
  sheet.appendRow(['18CS63', 'Web Technology', 6, 'FAC001']);
  sheet.appendRow(['18CS64', 'Data Mining', 6, 'FAC002']);
  sheet.appendRow(['18CS65', 'Cloud Computing', 6, 'FAC001']);

  // --- Sessions Tab ---
  sheet = ss.getSheetByName('Sessions');
  if (!sheet) sheet = ss.insertSheet('Sessions');
  sheet.clear();
  sheet.appendRow(['SessionID', 'FacultyID', 'SubjectCode', 'SubjectName', 'Room', 'Section', 'Token', 'StartTime', 'EndTime', 'Status', 'Lat', 'Lng']);

  // --- Attendance Tab ---
  sheet = ss.getSheetByName('Attendance');
  if (!sheet) sheet = ss.insertSheet('Attendance');
  sheet.clear();
  sheet.appendRow(['USN', 'StudentName', 'SessionID', 'SubjectCode', 'SubjectName', 'Timestamp', 'GPSLat', 'GPSLng', 'VerifyStatus']);

  // --- Timetable Tab ---
  sheet = ss.getSheetByName('Timetable');
  if (!sheet) sheet = ss.insertSheet('Timetable');
  sheet.clear();
  sheet.appendRow(['ID', 'Day', 'StartTime', 'EndTime', 'SubjectCode', 'SubjectName', 'FacultyID', 'Section', 'Room', 'Status']);
  sheet.appendRow(['tt1', 'Monday', '09:00', '10:00', '18CS61', 'System Software', 'FAC001', '6A', 'LH-101', 'UPCOMING']);
  sheet.appendRow(['tt2', 'Monday', '10:00', '11:00', '18CS62', 'Computer Graphics', 'FAC002', '6A', 'LH-101', 'UPCOMING']);
  sheet.appendRow(['tt3', 'Monday', '11:15', '12:15', '18CS63', 'Web Technology', 'FAC001', '6A', 'LAB-2', 'UPCOMING']);
  sheet.appendRow(['tt4', 'Tuesday', '09:00', '10:00', '18CS64', 'Data Mining', 'FAC002', '6A', 'LH-102', 'UPCOMING']);
  sheet.appendRow(['tt5', 'Tuesday', '10:00', '11:00', '18CS65', 'Cloud Computing', 'FAC001', '6A', 'LH-101', 'UPCOMING']);

  // --- Rooms Tab ---
  sheet = ss.getSheetByName('Rooms');
  if (!sheet) sheet = ss.insertSheet('Rooms');
  sheet.clear();
  sheet.appendRow(['RoomName', 'Latitude', 'Longitude', 'RadiusMeters']);
  // Default coordinates — UPDATE THESE to your actual college coordinates!
  sheet.appendRow(['LH-101', 12.9716, 77.5946, 100]);
  sheet.appendRow(['LH-102', 12.9716, 77.5946, 100]);
  sheet.appendRow(['LAB-2', 12.9716, 77.5946, 100]);

  Logger.log('✅ All seed data inserted successfully!');
}
