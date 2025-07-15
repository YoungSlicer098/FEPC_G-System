document.addEventListener("DOMContentLoaded", function () {

    console.log("Script loaded!");
    console.log(document.getElementById("searchStudent")); // should not be null
    console.log(typeof updateSearchResultsRow); // should be 'function'

    // Function to update visibility of "No students yet" row
    function updateNoStudentsRow() {
        const studentList = document.getElementById('studentList');
        const allRows = studentList.querySelectorAll("tr:not(#noStudentsRow)");
        const visibleRows = Array.from(allRows).filter(row => row.offsetParent !== null);
        const noStudentsRow = document.getElementById("noStudentsRow");

        if (noStudentsRow) {
            noStudentsRow.classList.toggle("hidden", visibleRows.length > 0);
        }
    }

    function updateSearchResultsRow(query) {
        const studentList = document.getElementById('studentList');
        const noSearchResultsRow = document.getElementById("noSearchResultsRow");
        const noStudentsRow = document.getElementById("noStudentsRow");

        if (!studentList) return;

        const studentRows = Array.from(studentList.querySelectorAll("tr:not(#noStudentsRow):not(#noSearchResultsRow)"));
        const visibleRows = studentRows.filter(row => row.style.display !== "none");

        if (noSearchResultsRow) {
            if (query.trim() !== "") {
                noSearchResultsRow.classList.toggle("hidden", visibleRows.length > 0);
                noStudentsRow?.classList.add("hidden");
            } else {
                noSearchResultsRow.classList.add("hidden");
                if (visibleRows.length === 0 && noStudentsRow) {
                    noStudentsRow.classList.remove("hidden");
                }
            }
        }
    }

    const studentIDInput = document.getElementById("studentID");
        studentIDInput?.addEventListener("input", function () {
            // Allow only digits and special characters (e.g., "-", "/", etc.)
            this.value = this.value.replace(/[^0-9\-\/]/g, '');
        }
    );

    // search student
    const searchInput = document.getElementById("searchStudent");

    // Filter out special rows like "no students yet" or "no results found"
    const getStudentRows = () => Array.from(document.querySelectorAll("#studentList tr"))
        .filter(row => !row.id || (row.id !== "noSearchResultsRow" && row.id !== "noStudentsRow"));

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            const query = this.value.trim().toLowerCase();
            let foundMatch = false;

            getStudentRows().forEach(row => {
                const name = row.querySelector(".student-name")?.textContent.toLowerCase() || "";
                const id = row.querySelector(".student-id")?.textContent.toLowerCase() || "";
                const matches = name.includes(query) || id.includes(query);

                row.style.display = matches ? "" : "none";
                if (matches) foundMatch = true;
            });

            updateSearchResultsRow(query);
        });
    }

    updateNoStudentsRow();
    updateSearchResultsRow("");


    // Add student modal elements
    const addStudentBtn = document.getElementById("addStudentBtn");
    const addStudentModal = document.getElementById("addStudentModal");
    const closeStudentModal = document.getElementById("closeStudentModal");
    const studentForm = document.getElementById("studentForm");
    const successMessage = document.getElementById("studentSuccessMessage");
    const errorMessage = document.getElementById("studentErrorMessage");

    // Show add student modal
    addStudentBtn?.addEventListener("click", () => {
        addStudentModal.classList.remove("hidden");
    });

    // Close modal
    closeStudentModal?.addEventListener("click", () => {
        addStudentModal.classList.add("hidden");
        studentForm.reset();
    });

    // Handle form submission
    studentForm?.addEventListener("submit", (e) => {
        e.preventDefault();

        const studentName = document.getElementById("studentName").value.trim();
        const studentID = document.getElementById("studentID").value.trim();
        const studentEmail = document.getElementById("studentEmail").value.trim();
        const courseId = document.getElementById("courseId").value;

        // Validation
        if (!studentName || !studentID || !studentEmail) {
            displayMessage(errorMessage, "Please fill in all fields.", "error");
            return;
        }

        const emailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        const studentIdPattern = /^[0-9\-\_\.]+$/;

        let hasError = false;

        // Reset all errors
        document.getElementById("studentIDError").classList.add("hidden");
        document.getElementById("studentEmailError").classList.add("hidden");

        // Validate Student ID
        if (!studentIdPattern.test(studentID)) {
            document.getElementById("studentIDError").textContent = "Only numbers and - _ . are allowed.";
            document.getElementById("studentIDError").classList.remove("hidden");
            hasError = true;
        }

        // Validate Email
        if (!emailPattern.test(studentEmail)) {
            document.getElementById("studentEmailError").textContent = "Email must be a valid @gmail.com address.";
            document.getElementById("studentEmailError").classList.remove("hidden");
            hasError = true;
        }

        if (hasError) return; // Stop the form submission

        // Sending data to server
        fetch("/add-student/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRFToken": csrfToken,  // Make sure csrfToken is defined in your template
            },
            body: `name=${encodeURIComponent(studentName)}&student_id=${encodeURIComponent(studentID)}&email=${encodeURIComponent(studentEmail)}&password=${encodeURIComponent(studentID)}&course_id=${encodeURIComponent(courseId)}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                displayMessage(successMessage, "Student added successfully!", "success");
                addStudentModal.classList.add("hidden");
                studentForm.reset();

                // Add new student to the table dynamically
                const studentList = document.getElementById("studentList");
                const newRow = document.createElement("tr");
                newRow.className = "hover:bg-gray-100";
                newRow.innerHTML = `
                    <td class="p-3 student-id">${studentID}</td>
                    <td class="p-3 student-name">${studentName}</td>
                    <td class="p-3">
                        <span class="bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                    </td>
                    <td class="p-3 text-center space-x-2">
                        <button class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 profileBtn">Profile</button>
                        <a href="/supervisor/students/${studentID}/attendance/" class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">Attendance</a>
                        <span class="student-email hidden">${studentEmail}</span>
                    </td>
                `;

                studentList.appendChild(newRow);

                // Re-attach event listener to new profile button
                newRow.querySelector(".profileBtn").addEventListener("click", function () {
                    openProfileModal(studentName, studentID, studentEmail);
                });

                // Hide the "no students" row if it's visible
                const noStudentsRow = document.getElementById("noStudentsRow");
                if (noStudentsRow) noStudentsRow.classList.add("hidden");
                updateNoStudentsRow();
                updateSearchResultsRow(document.getElementById("searchStudent").value || "");
                studentList.offsetHeight; // This triggers a reflow to ensure the new row is properly aligned

                setTimeout(() => {
                    location.reload(); //to reload the page after adding
                }, 300); 

            } else {
                // Reset all field errors
                document.getElementById("studentEmailError").classList.add("hidden");
                document.getElementById("studentIDError").classList.add("hidden");

                if (data.error.includes("Email already exists")) {
                    document.getElementById("studentEmailError").textContent = "This email is already registered.";
                    document.getElementById("studentEmailError").classList.remove("hidden");
                } else if (data.error.includes("Student ID already exists")) {
                    document.getElementById("studentIDError").textContent = "This student ID is already in use.";
                    document.getElementById("studentIDError").classList.remove("hidden");
                } else {
                    displayMessage(errorMessage, 'Error: ' + data.error, "error");
                }
            }

        })
        .catch(error => {
            console.error('Error:', error);
            displayMessage(errorMessage, 'An error occurred. Please try again.', "error");
        });
    });


    // Function to display success or error message
    function displayMessage(element, message, type) {
        element.textContent = message;
        element.classList.remove('hidden');
        element.classList.remove('success', 'error');
        element.classList.add(type);
        
        setTimeout(() => {
            element.classList.add('hidden');
        }, 3000); // Hide the message after 3 seconds
    }

    // Profile Modal Elements
    const profileModal = document.getElementById("profileModal");
    const closeProfileBtn = document.getElementById("closeProfileModal");
    let selectedStudentRow = null;

    document.getElementById("studentList")?.addEventListener("click", function (event) {
        const target = event.target;
        if (target.classList.contains("profileBtn")) {
            selectedStudentRow = target.closest("tr");

            const studentID = selectedStudentRow.querySelector(".student-id").textContent;
            const studentName = selectedStudentRow.querySelector(".student-name").textContent;
            const studentEmail = selectedStudentRow.querySelector(".student-email")?.textContent || "No Email";
            const studentPassword = selectedStudentRow.querySelector(".student-password")?.textContent || "Hidden for security";
            const studentCourse = document.getElementById("courseTitle").textContent.replace("Students - ", "");

            document.getElementById("profileID").textContent = studentID;
            document.getElementById("profileName").textContent = studentName;
            document.getElementById("profileEmail").textContent = studentEmail;
            document.getElementById("profilePassword").textContent = studentPassword;
            document.getElementById("profileCourse").textContent = studentCourse;

            profileModal.classList.remove("hidden");

            // Bind edit button every time a profile is opened
            document.getElementById("editProfile").onclick = () => {
                document.getElementById("editProfileName").value = studentName;
                document.getElementById("editProfileID").value = studentID;
                document.getElementById("editProfileEmail").value = studentEmail;

                editProfileModal.classList.remove("hidden");
            };
        }
    });

    closeProfileBtn?.addEventListener("click", () => {
        profileModal.classList.add("hidden");
    });

    // Student Removal Modal Elements
    const removeConfirmModal = document.getElementById("removeConfirmModal");
    const removeMessage = document.getElementById("removeMessage");
    const cancelRemoveBtn = document.getElementById("cancelRemove");
    const confirmRemoveBtn = document.getElementById("confirmRemove");

    let studentToRemove = null;

    // Handle "Remove" button (open confirm modal)
    document.getElementById("deleteStudent")?.addEventListener("click", (e) => {
        e.preventDefault(); // Prevent form submission if inside form
        if (selectedStudentRow) {
            studentToRemove = selectedStudentRow;
            const studentName = studentToRemove.querySelector(".student-name")?.textContent || "this student";
            removeMessage.innerHTML = `Are you sure you want to remove <strong>${studentName}</strong>?`;
            removeConfirmModal.classList.remove("hidden");
        }
    });

    // Handle "Cancel" button
    cancelRemoveBtn?.addEventListener("click", () => {
        removeConfirmModal.classList.add("hidden");
        studentToRemove = null; // reset selection just in case
    });

    // Handle "Confirm" delete
    confirmRemoveBtn?.addEventListener("click", () => {
        if (!studentToRemove) return;

        const studentID = studentToRemove.querySelector(".student-id")?.textContent;
        if (!studentID) {
            console.error("No student ID found.");
            return;
        }

        fetch("/delete-student/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({ student_id: studentID })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                studentToRemove.remove();
                updateNoStudentsRow();
                updateSearchResultsRow(document.getElementById("searchStudent").value || "");
                displayMessage(successMessage, "Student deleted successfully!", "success");
            } else {
                displayMessage(errorMessage, "Delete failed: " + data.error, "error");
            }

            setTimeout(() => {
                    location.reload(); //to reload the page after adding
                }, 300); 

        })
        .catch(err => {
            console.error("Delete error:", err);
            displayMessage(errorMessage, "An error occurred while deleting the student.", "error");
        })
        .finally(() => {
            studentToRemove = null;
            removeConfirmModal.classList.add("hidden");
            profileModal?.classList.add("hidden");
        });
    });


    // UPDATE STUDENT INFO
    const editProfileModal = document.getElementById("editProfileModal");
    const editProfileForm = document.getElementById("editProfileForm");

    // Submit edit form
    editProfileForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("editProfileName").value.trim();
        const studentId = document.getElementById("editProfileID").value.trim();
        const email = document.getElementById("editProfileEmail").value.trim();

        // Reset error state
        const emailErrorSpan = document.getElementById("editEmailError");
        emailErrorSpan.textContent = "";
        emailErrorSpan.classList.add("hidden");

        fetch("/edit-student/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({ student_id: studentId, name: name, email: email })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                selectedStudentRow.querySelector(".student-name").textContent = name;
                selectedStudentRow.querySelector(".student-id").textContent = studentId;
                selectedStudentRow.querySelector(".student-email").textContent = email;

                editProfileModal.classList.add("hidden");
                document.getElementById("profileModal").classList.add("hidden");

                displayMessage(successMessage, "Student updated successfully!", "success");
            } else {
                if (data.error && data.error.toLowerCase().includes("email")) {
                    emailErrorSpan.textContent = data.error;
                    emailErrorSpan.classList.remove("hidden");
                } else {
                    // Handle other errors
                    alert(data.error);
                }
            }
        });
    });

    document.getElementById("closeEditModal").addEventListener("click", () => {
        editProfileModal.classList.add("hidden");
    });


    function displayMessage(element, message, type) {
    element.textContent = message;
    element.classList.remove("hidden");

    // Apply color depending on message type
    if (type === "success") {
        element.classList.add("text-green-800");
        element.classList.remove("text-red-800");
    } else if (type === "error") {
        element.classList.add("text-red-800");
        element.classList.remove("text-green-800");
    }

    setTimeout(() => {
        element.classList.add("hidden");
    }, 3000);
    }

    setTimeout(() => {
        updateNoStudentsRow();
        updateSearchResultsRow(document.getElementById("searchStudent")?.value || "");
    }, 0);

});
