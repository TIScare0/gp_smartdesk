const state = {
  currentStep: 1,
  selectedCourse: null,
  selectedBranch: null,
  selectedSemester: null,
  selectedSubject: null,
  selectedAction: null,
  gtuData: [],
};

const DOM = {
  coursesGrid: document.getElementById("coursesGrid"),
  branchesGrid: document.getElementById("branchesGrid"),
  semestersGrid: document.getElementById("semestersGrid"),
  subjectsGrid: document.getElementById("subjectsGrid"),
  actionsGrid: document.getElementById("actionsGrid"),
  progressCard: document.getElementById("progressCard"),
  pdfContainer: document.getElementById("pdfContainer"),
  btnToBranches: document.getElementById("btnToBranches"),
  btnToCourses: document.getElementById("btnToCourses"),
  btnToSemesters: document.getElementById("btnToSemesters"),
  btnToBranches2: document.getElementById("btnToBranches2"),
  btnToSubjects: document.getElementById("btnToSubjects"),
  btnToSemesters2: document.getElementById("btnToSemesters2"),
  btnToActions: document.getElementById("btnToActions"),
  btnToSubjects2: document.getElementById("btnToSubjects2"),
  btnToProgress: document.getElementById("btnToProgress"),
  btnToActions2: document.getElementById("btnToActions2"),
  btnToPDF: document.getElementById("btnToPDF"),
  btnToProgress2: document.getElementById("btnToProgress2"),
  btnDownloadPDF: document.getElementById("btnDownloadPDF"),
};

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Load GTU data
  try {
    const response = await fetch("../js/gtu_data.json");
    state.gtuData = await response.json();
    renderCourses();
    applyTheme();
  } catch (error) {
    console.error("Failed to load GTU data:", error);
    showToast("Failed to load course data");
  }

  // Set up event listeners
  setupEventListeners();
});

// Apply theme from localStorage
async function applyTheme() {
  if ((await window.GetItem("aura_theme_mode")) === "dark") {
    document.body.classList.add("dark-theme");
  }
}

function renderCourses() {
  DOM.coursesGrid.innerHTML = "";

  // Extract unique courses from gtuData
  const courses = [
    ...new Set(
      state.gtuData.map((item) => ({
        code: item.code,
        name: item.name,
      })),
    ),
  ];

  courses.forEach((course) => {
    const card = document.createElement("div");
    card.className = "gtu-course-card";
    card.id = 'GtuCourseCard'
    card.innerHTML = `
          <div class="gtu-course-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zL2 17l10 5 10-5z"></path>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <line x1="6" y1="6" x2="6" y2="18"></line>
              <line x1="18" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <div class="gtu-course-info">
            <h3>${course.name}</h3>
            <p>Code: ${course.code}</p>
          </div>
        `;

    card.addEventListener("click", () => {
      // Remove active class from all cards
      document
        .querySelectorAll(".gtu-course-card")
        .forEach((c) => c.classList.remove("active"));
      // Add active class to clicked card
      card.classList.add("active");

      state.selectedCourse = course;
      DOM.btnToBranches.disabled = false;
    });

    DOM.coursesGrid.appendChild(card);
  });
}

// Render branches based on selected course
function renderBranches() {
  DOM.branchesGrid.innerHTML = "";

  if (!state.selectedCourse) return;

  // Find branches for selected course
  const courseData = state.gtuData.find(
    (item) => item.code === state.selectedCourse.code,
  );
  if (!courseData) return;

  const branches = courseData.branches;

  branches.forEach((branch) => {
    const card = document.createElement("div");
    card.className = "gtu-branch-card";
    card.innerHTML = `
          <div class="gtu-branch-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4M6.76 6.76l2.83 2.83M16.24 16.24l2.83 2.83M6.76 17.24l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
          </div>
          <div class="gtu-branch-info">
            <h3>${branch.branch_name}</h3>
            <p>Code: ${branch.branch_code}</p>
          </div>
        `;

    card.addEventListener("click", () => {
      // Remove active class from all cards
      document
        .querySelectorAll(".gtu-branch-card")
        .forEach((c) => c.classList.remove("active"));
      // Add active class to clicked card
      card.classList.add("active");

      state.selectedBranch = branch;
      DOM.btnToSemesters.disabled = false;
    });

    DOM.branchesGrid.appendChild(card);
  });
}

// Render semesters based on selected branch
function renderSemesters() {
  DOM.semestersGrid.innerHTML = "";

  if (!state.selectedBranch) return;

  const semesters = state.selectedBranch.sem_count;

  semesters.forEach((semester) => {
    const card = document.createElement("div");
    card.className = "gtu-semester-card";
    card.innerHTML = `
          <div class="gtu-semester-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="4" width="16" height="16" rx="4"></rect>
              <line x1="8" y1="8" x2="16" y2="16"></line>
              <line x1="16" y1="8" x2="8" y2="16"></line>
            </svg>
          </div>
          <div class="gtu-semester-info">
            <h3>Semester ${semester}</h3>
            <p>${semester === 1 || semester === 2 ? "First Year" : semester === 3 || semester === 4 ? "Second Year" : semester === 5 || semester === 6 ? "Third Year" : "Final Year"}</p>
          </div>
        `;

    card.addEventListener("click", () => {
      // Remove active class from all cards
      document
        .querySelectorAll(".gtu-semester-card")
        .forEach((c) => c.classList.remove("active"));
      // Add active class to clicked card
      card.classList.add("active");

      state.selectedSemester = semester;
      DOM.btnToSubjects.disabled = false;
    });

    DOM.semestersGrid.appendChild(card);
  });
}

// Render subjects (fake for now)
function renderSubjects() {
  DOM.subjectsGrid.innerHTML = "";

  // Fake subjects based on common GTU subjects
  const fakeSubjects = [
    "Mathematics - I",
    "Mathematics - II",
    "Physics",
    "Chemistry",
    "Programming for Problem Solving",
    "Basic Electrical Engineering",
    "Engineering Graphics",
    "Environmental Studies",
    "Engineering Mechanics",
    "Computer Programming",
    "Data Structures",
    "Database Management System",
    "Operating Systems",
    "Computer Networks",
    "Software Engineering",
    "Web Technologies",
    "Artificial Intelligence",
    "Machine Learning",
    "Cloud Computing",
    "Internet of Things",
  ];

  fakeSubjects.forEach((subject) => {
    const card = document.createElement("div");
    card.className = "gtu-subject-card";
    card.innerHTML = `
          <div class="gtu-subject-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16v16H4z"></path>
              <path d="M2 10h20M2 14h20M2 18h20"></path>
            </svg>
          </div>
          <div class="gtu-subject-info">
            <h3>${subject}</h3>
            <p>GTU Subject Code: ${Math.floor(Math.random() * 900) + 100}</p>
          </div>
        `;

    card.addEventListener("click", () => {
      // Remove active class from all cards
      document
        .querySelectorAll(".gtu-subject-card")
        .forEach((c) => c.classList.remove("active"));
      // Add active class to clicked card
      card.classList.add("active");

      state.selectedSubject = subject;
      DOM.btnToActions.disabled = false;
    });

    DOM.subjectsGrid.appendChild(card);
  });
}

// Render actions
function renderActions() {
  DOM.actionsGrid.innerHTML = "";

  const actions = [
    {
      name: "Solve Paper",
      description: "Get step-by-step solutions for GTU exam papers",
      icon: "calculator",
    },
    {
      name: "Merge all Papers and Solve",
      description: "Combine multiple papers and get comprehensive solutions",
      icon: "merge",
    },
  ];

  actions.forEach((action) => {
    const card = document.createElement("div");
    card.className = "gtu-action-card";
    card.innerHTML = `
          <div class="gtu-action-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${
                action.icon === "calculator"
                  ? '<path d="M12 2L2 7l10 5 10-5-10-5zL2 17l10 5 10-5z"></path><line x1="2" y1="12" x2="22" y2="12"></line><line x1="6" y1="6" x2="6" y2="18"></line><line x1="18" y1="6" x2="18" y2="18"></line>'
                  : '<path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path><path d="M5 11h14"></path><path d="M5 8h14"></path>'
              }
            </svg>
          </div>
          <div class="gtu-action-info">
            <h3>${action.name}</h3>
            <p>${action.description}</p>
          </div>
        `;

    card.addEventListener("click", () => {
      // Remove active class from all cards
      document
        .querySelectorAll(".gtu-action-card")
        .forEach((c) => c.classList.remove("active"));
      // Add active class to clicked card
      card.classList.add("active");

      state.selectedAction = action.name;
      DOM.btnToProgress.disabled = false;
    });

    DOM.actionsGrid.appendChild(card);
  });
}

// Show progress card
function showProgress() {
  DOM.progressCard.innerHTML = `
        <div class="gtu-progress-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4M6.76 6.76l2.83 2.83M16.24 16.24l2.83 2.83M6.76 17.24l2.83-2.83M16.24 7.76l2.83-2.83"></path>
          </svg>
        </div>
        <div class="gtu-progress-text">
          <h3>Processing Your Request</h3>
          <p>Generating solutions for ${state.selectedSubject} (Semester ${state.selectedSemester})</p>
          <div class="gtu-progress-bar">
            <div class="gtu-progress-fill" id="progressFill" style="width: 0%"></div>
          </div>
          <div class="gtu-progress-details">
            <span>0% Complete</span>
            <span class="gtu-progress-estimate">Estimated time: 2m 30s</span>
          </div>
        </div>
      `;

  // Simulate progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 10;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      DOM.btnToPDF.disabled = false;
    }
    document.getElementById("progressFill").style.width = `${progress}%`;
    document.querySelector(
      ".gtu-progress-details span:first-child",
    ).textContent = `${Math.round(progress)}% Complete`;
  }, 200);
}

// Show PDF viewer (fake for now)
function showPDF() {
  DOM.pdfContainer.innerHTML = `
        <div class="gtu-pdf-header">
          <h3>${state.selectedSubject} - Solution Paper</h3>
          <p>Semester ${state.selectedSemester} | ${state.selectedBranch.branch_name}</p>
        </div>
        <div class="gtu-pdf-preview">
          <div class="gtu-pdf-page">
            <div class="gtu-pdf-header-bar">
              <span>GTU ${state.selectedCourse.name}</span>
              <span>Exam Solutions</span>
            </div>
            <div class="gtu-pdf-content">
              <p><strong>Question 1:</strong> Solve the following differential equation:</p>
              <p><em>dy/dx + y tan x = sec x</em></p>
              <br>
              <p><strong>Solution:</strong></p>
              <p>This is a linear differential equation of the form dy/dx + P(x)y = Q(x)</p>
              <p>Where P(x) = tan x and Q(x) = sec x</p>
              <br>
              <p>Integrating Factor (IF) = e<sup>∫P(x)dx</sup> = e<sup>∫tan x dx</sup> = e<sup>-ln|cos x|</sup> = 1/|cos x| = sec x</p>
              <br>
              <p>Solution: y × IF = ∫Q(x) × IF dx + C</p>
              <p>y × sec x = ∫sec x × sec x dx + C</p>
              <p>y × sec x = ∫sec² x dx + C</p>
              <p>y × sec x = tan x + C</p>
              <p>Therefore, y = (tan x + C) / sec x = sin x + C cos x</p>
              <br>
              <hr>
              <p><strong>Question 2:</strong> Find the eigenvalues of the matrix:</p>
              <p>[2 1]</p>
              <p>[1 2]</p>
              <br>
              <p><strong>Solution:</strong></p>
              <p>The characteristic equation is |A - λI| = 0</p>
              <p>|2-λ  1|  = 0</p>
              <p>|1   2-λ|</p>
              <p>(2-λ)(2-λ) - (1)(1) = 0</p>
              <p>λ² - 4λ + 4 - 1 = 0</p>
              <p>λ² - 4λ + 3 = 0</p>
              <p>(λ - 1)(λ - 3) = 0</p>
              <p>Therefore, λ₁ = 1 and λ₂ = 3</p>
            </div>
            <div class="gtu-pdf-footer-bar">
              <span>Page 1 of 5</span>
              <span>Generated by AURA GTU Paper Solver</span>
            </div>
          </div>
        </div>
        <div class="gtu-pdf-controls">
          <button class="gtu-pdf-control-btn" id="btnZoomIn">+ Zoom In</button>
          <button class="gtu-pdf-control-btn" id="btnZoomOut">- Zoom Out</button>
          <button class="gtu-pdf-control-btn" id="btnPrevPage">◀ Previous</button>
          <span class="gtu-page-indicator">1 / 5</span>
          <button class="gtu-pdf-control-btn" id="btnNextPage">Next ▶</button>
        </div>
      `;

  // Add event listeners for PDF controls
  document.getElementById("btnZoomIn")?.addEventListener("click", () => {
    showToast("Zoom In clicked");
  });
  document.getElementById("btnZoomOut")?.addEventListener("click", () => {
    showToast("Zoom Out clicked");
  });
  document.getElementById("btnPrevPage")?.addEventListener("click", () => {
    showToast("Previous Page clicked");
  });
  document.getElementById("btnNextPage")?.addEventListener("click", () => {
    showToast("Next Page clicked");
  });
}

// Navigate between steps
function goToStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll(".gtu-step").forEach((step) => {
    step.classList.remove("active");
  });

  // Show selected step
  const targetStep = document.getElementById(
    `step-${["course", "branch", "semester", "subject", "actions", "progress", "pdf"][stepNumber - 1]}`,
  );
  if (targetStep) {
    targetStep.classList.add("active");
  }

  state.currentStep = stepNumber;

  // Update button states based on step
  updateButtonStates();
}

// Update button states based on current step and selections
function updateButtonStates() {
  // Back buttons
  DOM.btnToCourses.disabled = state.currentStep !== 2;
  DOM.btnToBranches2.disabled = state.currentStep !== 3;
  DOM.btnToSemesters2.disabled = state.currentStep !== 4;
  DOM.btnToSubjects2.disabled = state.currentStep !== 5;
  DOM.btnToActions2.disabled = state.currentStep !== 6;
  DOM.btnToProgress2.disabled = state.currentStep !== 7;

  // Next buttons
  DOM.btnToBranches.disabled = state.currentStep !== 1 || !state.selectedCourse;
  DOM.btnToSemesters.disabled =
    state.currentStep !== 2 || !state.selectedBranch;
  DOM.btnToSubjects.disabled =
    state.currentStep !== 3 || !state.selectedSemester;
  DOM.btnToActions.disabled = state.currentStep !== 4 || !state.selectedSubject;
  DOM.btnToProgress.disabled = state.currentStep !== 5 || !state.selectedAction;
  DOM.btnToPDF.disabled = state.currentStep !== 6; // Will be enabled during progress simulation

  // Download button
  DOM.btnDownloadPDF.disabled = state.currentStep !== 7;
}

// Set up event listeners
function setupEventListeners() {
  // Navigation buttons
  DOM.btnToBranches?.addEventListener("click", () => {
    renderBranches();
    goToStep(2);
  });

  DOM.btnToCourses?.addEventListener("click", () => {
    goToStep(1);
  });

  DOM.btnToSemesters?.addEventListener("click", () => {
    renderSemesters();
    goToStep(3);
  });

  DOM.btnToBranches2?.addEventListener("click", () => {
    goToStep(2);
  });

  DOM.btnToSubjects?.addEventListener("click", () => {
    renderSubjects();
    goToStep(4);
  });

  DOM.btnToSemesters2?.addEventListener("click", () => {
    goToStep(3);
  });

  DOM.btnToActions?.addEventListener("click", () => {
    renderActions();
    goToStep(5);
  });

  DOM.btnToSubjects2?.addEventListener("click", () => {
    goToStep(4);
  });

  DOM.btnToProgress?.addEventListener("click", () => {
    showProgress();
    goToStep(6);
  });

  DOM.btnToActions2?.addEventListener("click", () => {
    goToStep(5);
  });

  DOM.btnToPDF?.addEventListener("click", () => {
    showPDF();
    goToStep(7);
  });

  DOM.btnToProgress2?.addEventListener("click", () => {
    goToStep(6);
  });

  DOM.btnDownloadPDF?.addEventListener("click", () => {
    // Simulate PDF download
    showToast("PDF download started...");
    setTimeout(() => {
      showToast("PDF downloaded successfully!");
    }, 1500);
  });
}

// Show toast notification
function showToast(message) {
  if (!window.showAuraToast) {
    // Fallback if the function isn't available yet
    const toast = document.createElement("div");
    toast.className = "editorial-toast";
    toast.innerText = message;
    document.getElementById("toastContainer").appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2200);
  } else {
    window.showAuraToast(message);
  }
}
