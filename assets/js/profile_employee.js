const employeeForm = document.getElementById("addEmployeeForm");

// fetch data employee 
async function fetchEmployees() {
    try {
        const tableBody = document.getElementById("employeeTable").getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

        const response = await fetch("http://localhost:8000/employee/view");
        const employees = await response.json();

        tableBody.innerHTML = '';
        employees.sort((a, b) => a.first_name.localeCompare(b.first_name));
        
        employees.forEach(employee => {
            const row = document.createElement("tr");

            row.innerHTML = `
            <td class="text-center">${employee.nrp_id}</td>
            <td class="text-center">${employee.first_name}</td>
            <td class="text-center">${employee.last_name}</td>
            <td class="text-center">${employee.position}</td>
            <td class="text-center">${employee.department}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-info" onclick="viewProfile('${employee.employee_id}')">View Profile</button>
                <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${employee.employee_id})">Delete</button>
                <button class="btn btn-sm btn-warning" onclick="editEmployee(${employee.employee_id})">Edit</button>           
            </td>
            `;

            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
    }
}

// View Profile Employee
async function viewProfile(id) {
    try {
        const token = localStorage.getItem("token"); 

        const response = await fetch(`http://localhost:8000/employee/profile/${id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`  
            }
        });

        if (!response.ok) {
            throw new Error('Employee not found');
        }

        const employee = await response.json();
        
        document.getElementById('modalFirstName').innerText = employee.first_name;
        document.getElementById('modalLastName').innerText = employee.last_name;
        document.getElementById('modalNRP').innerText = employee.nrp_id;
        document.getElementById('modalEmail').innerText = employee.email;
        document.getElementById('modalPhoneNumber').innerText = employee.phone_number;
        document.getElementById('modalPosition').innerText = employee.position;
        document.getElementById('modalDepartment').innerText = employee.department;
        document.getElementById('modalDate').innerText = employee.join_date;

        const profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
        profileModal.show();
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}


async function isEmailAvail(email, id = null) {
    try {
        let url = `http://localhost:8000/employee/check_email/${email}`;
        if (id) {
            url += `?exclude_id=${id}`;
        }
        const response = await fetch(url);
        const result = await response.json();
        return result.available;
    } catch (error) {
        console.error("Error checking email availability:", error);
        return false;
    }
}

document.getElementById('submit').addEventListener('click', saveEmployee);
async function saveEmployee(e) {
    e.preventDefault(); 
    const firstName = document.getElementById('first_name').value.trim();
    const lastName = document.getElementById('last_name').value.trim();
    const nrp = document.getElementById('nrp_id').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone_number').value.trim();
    const position = document.getElementById('position').value.trim();
    const department = document.getElementById('department').value.trim();
    const joinDate = document.getElementById('join_date').value.trim();

    const emailAvailable = await isEmailAvail(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^08[0-9]{8,11}$/;

    if (!firstName || !lastName || !email || !phone || !nrp || !position || !department || !joinDate) {
        Swal.fire('Error!', 'Please fill in all required fields.', 'error');
        return;
    }

    if (!emailRegex.test(email)) {
        Swal.fire('Error!', 'Please enter a valid email address. Example : yourname@gmail.com', 'error');
        return;
    }

    if (!emailAvailable) {
        Swal.fire('Error!', 'Email already exists. Please choose another one.', 'error');
        return;
    }

    if (!phoneRegex.test(phone)) {
        Swal.fire('Error!', 'Phone number must be 10–13 digits (numbers only) and starts with 08.', 'error');
        return;
    }

    if (nrp.length !== 9) {
        Swal.fire('Error!', 'NRP must be exactly 9 digits.', 'error');
        return;
    }

    // ✅ Validasi face capture
    if (capturedImages.length < 4) {
        Swal.fire("Error!", "Please capture 4 face images first.", "error");
        return;
    }

    // ✅ Kirim data + foto
    const formData = new FormData(employeeForm);
    formData.delete("photo"); // Hapus input lama

    capturedImages.forEach((imgData, idx) => {
        const blob = dataURLtoBlob(imgData);
        formData.append("files", blob, `face_${idx + 1}.jpg`);
    });

    // 🔹 CEK DATA YANG DIKIRIM
    for (let pair of formData.entries()) {
        console.log(pair[0] + ": " + pair[1]);
    }

    const token = localStorage.getItem('token');

    try {
        $('#addEmployeeModal').modal('hide');
        Swal.fire({
            title: 'Registering...',
            text: 'Please wait while we save the employee data.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await fetch("http://localhost:8000/employee/add", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        Swal.close();

        if (response.ok) {
            Swal.fire({
                title: 'Success!',
                text: 'Employee registered successfully!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

            employeeForm.reset();
            capturedImages = []; // reset foto
            fetchEmployees();

        } else {
            const errorData = await response.json();
            Swal.fire('Error!', errorData.detail || 'Failed to register employee.', 'error');
        }
    } catch (error) {
        Swal.fire('Error!', `An error occurred: ${error.message}`, 'error');
    }
}

const videoPreview = document.getElementById("videoPreview");
const captureBtn = document.getElementById("captureBtn");
const finishBtn = document.getElementById("finishBtn");
const captureStep = document.getElementById("captureStep");
const captureInstruction = document.getElementById("captureInstruction");

const thumbs = [
    document.getElementById("thumb1"),
    document.getElementById("thumb2"),
    document.getElementById("thumb3"),
    document.getElementById("thumb4"),
];

const capturedPreview = document.getElementById("capturedPreview");

let capturedImages = [];
let stepIndex = 0;
let stream;

// 🔹 Instruksi untuk tiap step
const instructions = [
    "Look Straight at the Camera",
    "Turn Head to the Right",
    "Turn Head to the Left",
    "Smile at the Camera",
];

// 🔹 Start Camera ketika modal dibuka
document.getElementById("captureFaceModal").addEventListener("shown.bs.modal", async () => {
    capturedImages = [];
    stepIndex = 0;
    updateStepUI();

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoPreview.srcObject = stream;
    } catch (err) {
        Swal.fire("Error", "Cannot access camera: " + err.message, "error");
    }
});

// 🔹 Stop Camera ketika modal ditutup
document.getElementById("captureFaceModal").addEventListener("hidden.bs.modal", () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

// 🔹 Capture button logic
captureBtn.addEventListener("click", () => {
    if (stepIndex >= 4) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoPreview.videoWidth;
    canvas.height = videoPreview.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL("image/jpeg");
    capturedImages.push(dataURL);
    thumbs[stepIndex].src = dataURL;

    stepIndex++;
    updateStepUI();

    if (stepIndex === 4) {
        captureBtn.classList.add("d-none");
        finishBtn.classList.remove("d-none");
    }
});

finishBtn.addEventListener("click", () => {
    updatePreviewInForm();
    $("#captureFaceModal").modal("hide");

    // Tunggu modal face capture benar-benar tertutup dulu
    $('#captureFaceModal').on('hidden.bs.modal', function () {
        $("#addEmployeeModal").modal("show");
        // Supaya event tidak nambah berkali-kali
        $('#captureFaceModal').off('hidden.bs.modal');
    });
});

// 🔹 Update UI tiap step
function updateStepUI() {
    captureStep.textContent = `Step ${stepIndex + 1} of 4`;
    captureInstruction.textContent = instructions[stepIndex] || "Done!";
}

// 🔹 Update preview di form utama
function updatePreviewInForm() {
    capturedPreview.innerHTML = "";
    capturedImages.forEach((imgData) => {
        const img = document.createElement("img");
        img.src = imgData;
        img.width = 70;
        img.height = 70;
        img.classList.add("rounded", "border");
        capturedPreview.appendChild(img);
    });
}

// 🔹 Convert Base64 → Blob
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}


// edit employee
document.getElementById('submitEdit').addEventListener('click', saveEditedEmployee);
async function editEmployee(id) {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:8000/employee/profile/${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error('Employee not found');
        }
        const employee = await response.json();

        document.getElementById('editfirst_name').value = employee.first_name;
        document.getElementById('editlast_name').value = employee.last_name;
        document.getElementById('editemail').value = employee.email;
        document.getElementById('editphone_number').value = employee.phone_number;
        document.getElementById('editposition').value = employee.position;
        document.getElementById('editdepartment').value = employee.department;

        // Set ID ke form supaya pas save bisa tahu edit siapa
        const editEmployeeForm = document.getElementById('editEmployeeForm');
        editEmployeeForm.setAttribute('data-employee-id', id);

        // Buka Modal
        const editModal = new bootstrap.Modal(document.getElementById('editEmployeeModal'));
        editModal.show();


    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

async function saveEditedEmployee(e) {
    e.preventDefault(); 
    const editEmployeeForm = document.getElementById('editEmployeeForm');

    // Ambil employeeId terlebih dahulu sebelum dipakai
    const employeeId = editEmployeeForm.getAttribute('data-employee-id');

    // manual validation
    const efirstName = document.getElementById('editfirst_name').value.trim();
    const elastName = document.getElementById('editlast_name').value.trim();
    const eemail = document.getElementById('editemail').value.trim();
    const ephone = document.getElementById('editphone_number').value.trim();
    const eposition = document.getElementById('editposition').value.trim();
    const edepartment = document.getElementById('editdepartment').value.trim();

    const eemailAvailable = await isEmailAvail(eemail, employeeId);  // ✅ employeeId sudah diinisialisasi
    
    const eemailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const ephoneRegex = /^08[0-9]{8,11}$/;

    if (!efirstName || !elastName || !eemail || !ephone || !eposition || !edepartment) {
        Swal.fire('Error!', 'Please fill in all required fields.', 'error');
        return;
    }

    if (!eemailRegex.test(eemail)) {
        Swal.fire('Error!', 'Please enter a valid email address. Example : yourname@gmail.com', 'error');
        return;
    }
    
    if (!eemailAvailable) {
        Swal.fire('Error!', 'Email already exists. Please choose another one.', 'error');
        return;
    }

    if (!ephoneRegex.test(ephone)) {
        Swal.fire('Error!', 'Phone number must be 10–13 digits (numbers only) and starts with 08.', 'error');
        return;
    }

    const formData = new FormData(editEmployeeForm);
    const token = localStorage.getItem('token');

    try {
        $('#editEmployeeModal').modal('hide');

        const response = await fetch(`http://localhost:8000/employee/edit/${employeeId}`, {
            method: "POST",
             headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        Swal.close();

        if (response.ok) {
            Swal.fire({
                title: 'Success!',
                text: 'Employee updated successfully!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

            editEmployeeForm.reset();
            fetchEmployees(); 
        
        } else {
            const errorData = await response.json();
            Swal.fire('Error!', errorData.detail || 'Failed to update employee.', 'error');
        }

    } catch (error) {
        Swal.fire('Error!', `An error occurred: ${error.message}`, 'error');
    }
}
//delete employee
async function deleteEmployee(id) {
    const confirmResult = await Swal.fire({
        title: 'Are you sure you want to delete?',
        text: `Employee ID: ${id}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel'
    });

    if (confirmResult.isConfirmed) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/employee/delete/${id}`, {
            method: 'DELETE',
            headers: {
                "Authorization": `Bearer ${token}`
            },
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Employee successfully deleted.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
            });

            fetchEmployees();

            } else {
                const errorData = await response.json();
                Swal.fire('Error!', errorData.detail || 'Failed to delete employee.', 'error');
            }
        } catch (error) {
            Swal.fire('Error!', `An error occurred: ${error.message}`, 'error');
        }
    }
}

// dropdown dept + position
async function loadDept() {
    try {
        const response = await fetch('http://localhost:8000/employee/departmentfilter');
        const dept = await response.json();
        const deptSelect = document.getElementById('filterDepartment');

        dept.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            deptSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load dept', error);
    }
}
async function loadPosition() {
    try {
        const response = await fetch('http://localhost:8000/employee/positionfilter');
        const positions = await response.json();
        const positionSelect = document.getElementById('filterPosition');

        positions.forEach(position => {
            const option = document.createElement('option');
            option.value = position;
            option.textContent = position;
            positionSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load positions', error);
    }
}
loadDept();
loadPosition();

// filter search entirely
const searchInput = document.getElementById('searchInput');
const filterDepartment = document.getElementById('filterDepartment');
const filterPosition = document.getElementById('filterPosition');

// Debounce untuk mencegah spam pencarian
let debounceTimer;
const debounce = (callback, delay) => {
    return (...args) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => callback(...args), delay);
    };
};

searchInput.addEventListener('input', debounce(filterEmployees, 300));
filterDepartment.addEventListener('change', filterEmployees);
filterPosition.addEventListener('change', filterEmployees);

function filterEmployees() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const filterDepartment = document.getElementById('filterDepartment').value.toLowerCase();
    const filterPosition = document.getElementById('filterPosition').value.toLowerCase();
           
    const rows = document.querySelectorAll('#employeeTable tbody tr');

    rows.forEach(row => {
        if (row.cells.length < 5) return;  // skip incomplete rows
    
        const nrp = row.cells[0].textContent.toLowerCase();
        const firstName = row.cells[1].textContent.toLowerCase();
        const lastName = row.cells[2].textContent.toLowerCase();
        const position = row.cells[3].textContent.toLowerCase();
        const department = row.cells[4].textContent.toLowerCase();
    
        const matchesSearch = firstName.includes(searchValue) || 
                             lastName.includes(searchValue) ||
                             nrp.includes(searchValue);
    
        const matchesDepartment = filterDepartment === '' || department.includes(filterDepartment);
        const matchesPosition = filterPosition === '' || position.includes(filterPosition);
    
        if (matchesSearch && matchesDepartment && matchesPosition) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

document.getElementById('clearFiltersButton').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterDepartment').value = '';
    document.getElementById('filterPosition').value = '';
    filterEmployees();
});

fetchEmployees();
filterEmployees();