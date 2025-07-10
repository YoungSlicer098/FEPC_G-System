const params = new URLSearchParams(window.location.search);
const studentName = params.get("student") || "Student Name";
const courseName = params.get("course") || "Course Name"; // ✅ Add this line

document.getElementById("studentNameHeader").textContent = studentName;

// ✅ Set dynamic back link
const backLink = document.getElementById("backLink");
backLink.href = `view_students.html?course=${encodeURIComponent(courseName)}`;
