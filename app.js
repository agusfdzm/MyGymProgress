const STORAGE_KEY = 'mygymprogress-routines-v2';
const NOTE_KEY = 'mygymprogress-journal';
const routineForm = document.getElementById('routine-form');
const list = document.getElementById('routine-list');
const journalTextarea = document.getElementById('journal-textarea');
const galleryPanel = document.getElementById('gallery-panel');
const detailSection = document.getElementById('routine-detail');
const detailTitle = document.getElementById('detail-title');
const detailSubtitle = document.getElementById('detail-subtitle');
const detailContent = document.getElementById('detail-content');
const backToGallery = document.getElementById('back-to-gallery');
const deleteRoutineButton = document.getElementById('delete-routine');
const emptyState = document.getElementById('empty-state');
const clearAllButton = document.getElementById('clear-all');

let routines = loadRoutines();
let selectedRoutineId = null;

function loadJournal() {
  return localStorage.getItem(NOTE_KEY) || '';
}

function saveJournal() {
  localStorage.setItem(NOTE_KEY, journalTextarea.value);
}

journalTextarea.value = loadJournal();
journalTextarea.addEventListener('input', saveJournal);

function loadRoutines() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('No se pudieron cargar las rutinas', error);
    return [];
  }
}

function saveRoutines() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getRoutineSummary(routine) {
  const allSessions = routine.exercises.flatMap((exercise) =>
    exercise.sessions.map((session) => ({ ...session, exercise: exercise.name }))
  );

  const latest = allSessions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const completedExercises = routine.exercises.filter((exercise) => exercise.sessions.length > 0).length;

  return {
    lastSession: latest
      ? `${latest.exercise} ${latest.weight}kg · ${latest.reps} reps · RIR ${latest.rir}`
      : 'Todavía no hay sesiones',
    stats: `${routine.exercises.length} ejercicio${routine.exercises.length === 1 ? '' : 's'} · ${completedExercises} con historial`
  };
}

function renderRoutines() {

  if (!routines.length) {
    emptyState.hidden = false;
    list.innerHTML = '';
    return;
  }

  emptyState.hidden = true;
  list.innerHTML = routines
    .map((routine) => {
      const summary = getRoutineSummary(routine);
      return `
        <article class="routine-card" data-action="open-routine" data-routine-id="${routine.id}">
          <div class="routine-header">
            <div>
              <div class="routine-name">${escapeHtml(routine.name)}</div>
              <div class="routine-subtitle">${escapeHtml(summary.stats)}</div>
            </div>
          </div>
          <div class="detail-meta">${escapeHtml(summary.lastSession)}</div>
        </article>
      `;
    })
    .join('');
}

function renderDetail() {
  const routine = routines.find((item) => item.id === selectedRoutineId);
  if (!routine) {
    showGallery();
    return;
  }

  detailTitle.textContent = routine.name;
  detailSubtitle.textContent = `${routine.exercises.length} ejercicio${routine.exercises.length === 1 ? '' : 's'} · ${routine.exercises.filter((exercise) => exercise.sessions.length > 0).length} con historial`;
  deleteRoutineButton.dataset.routineId = routine.id;

  const exercisesMarkup = routine.exercises.length
    ? routine.exercises
        .map((exercise) => {
          const sessions = [...exercise.sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
          const latest = sessions[sessions.length - 1];
          const latestText = latest
            ? `${latest.weight}kg · ${latest.reps} reps · RIR ${latest.rir}`
            : 'Sin sesiones aún';

          const historyMarkup = sessions.length
            ? sessions
                .map(
                  (session) =>
                    `<li>${formatDate(session.date)} · ${session.weight} kg · ${session.reps} reps · RIR ${session.rir}</li>`
                )
                .join('')
            : '<li>Todavía no hay historial para este ejercicio.</li>';

          return `
            <article class="exercise-card">
              <div class="exercise-head">
                <div>
                  <div class="exercise-name">${escapeHtml(exercise.name)}</div>
                  <div class="exercise-current">${escapeHtml(latestText)}</div>
                </div>
                <button class="ghost-btn danger" data-action="delete-exercise" data-routine-id="${routine.id}" data-exercise-id="${exercise.id}">Borrar</button>
              </div>

              <form class="session-form" data-action="add-session" data-routine-id="${routine.id}" data-exercise-id="${exercise.id}">
                <div class="field-row compact">
                  <div class="field-group">
                    <label>Kg</label>
                    <input name="weight" type="number" min="0" step="0.5" value="${latest ? latest.weight : 20}" required />
                  </div>
                  <div class="field-group">
                    <label>Reps</label>
                    <input name="reps" type="number" min="1" step="1" value="${latest ? latest.reps : 8}" required />
                  </div>
                  <div class="field-group">
                    <label>RIR</label>
                    <input name="rir" type="number" min="0" step="1" value="${latest ? latest.rir : 2}" required />
                  </div>
                </div>
                <button type="submit">Guardar</button>
              </form>

              <div class="history-box">
                <div class="history-label">Historial</div>
                <ul class="history-list">${historyMarkup}</ul>
              </div>
            </article>
          `;
        })
        .join('')
    : '<div class="empty-mini">Todavía no hay ejercicios. Añade uno para empezar.</div>';

  detailContent.innerHTML = `
    <div class="exercise-stack">${exercisesMarkup}</div>
    <form class="exercise-form" data-action="add-exercise" data-routine-id="${routine.id}">
      <div class="field-group">
        <label>Nombre del ejercicio</label>
        <input name="exerciseName" type="text" placeholder="Press de banca" required />
      </div>
      <button type="submit">Añadir</button>
    </form>
  `;
}

function showGallery() {
  selectedRoutineId = null;
  galleryPanel.classList.remove('hidden');
  detailSection.classList.add('hidden');
  renderRoutines();
}

function showDetail(routineId) {
  selectedRoutineId = routineId;
  galleryPanel.classList.add('hidden');
  detailSection.classList.remove('hidden');
  renderDetail();
}

routineForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(routineForm);
  const routineName = String(formData.get('routineName') || '').trim();
  if (!routineName) return;

  routines.unshift({
    id: createId(),
    name: routineName,
    exercises: []
  });

  saveRoutines();
  renderRoutines();
  routineForm.reset();
});

list.addEventListener('click', (event) => {
  const card = event.target.closest('article[data-action="open-routine"]');
  if (!card) return;
  const routineId = card.dataset.routineId;
  showDetail(routineId);
});

detailContent.addEventListener('submit', (event) => {
  const form = event.target.closest('form');
  if (!form) return;
  const action = form.dataset.action;
  const routineId = form.dataset.routineId;
  const exerciseId = form.dataset.exerciseId;

  if (action === 'add-exercise') {
    event.preventDefault();
    const exerciseName = String(new FormData(form).get('exerciseName') || '').trim();
    if (!exerciseName) return;

    const routine = routines.find((item) => item.id === routineId);
    if (!routine) return;

    routine.exercises.push({
      id: createId(),
      name: exerciseName,
      sessions: []
    });

    saveRoutines();
    renderDetail();
  }

  if (action === 'add-session') {
    event.preventDefault();
    const formData = new FormData(form);
    const weight = Number(formData.get('weight'));
    const reps = Number(formData.get('reps'));
    const rir = Number(formData.get('rir'));

    const routine = routines.find((item) => item.id === routineId);
    const exercise = routine?.exercises.find((item) => item.id === exerciseId);
    if (!routine || !exercise) return;

    exercise.sessions.push({
      id: createId(),
      weight,
      reps,
      rir,
      date: new Date().toISOString()
    });

    saveRoutines();
    renderDetail();
  }
});

detailContent.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const routineId = button.dataset.routineId;
  const exerciseId = button.dataset.exerciseId;

  if (action === 'delete-exercise') {
    const routine = routines.find((item) => item.id === routineId);
    if (!routine) return;
    routine.exercises = routine.exercises.filter((exercise) => exercise.id !== exerciseId);
    saveRoutines();
    renderDetail();
  }
});

deleteRoutineButton.addEventListener('click', () => {
  const routineId = deleteRoutineButton.dataset.routineId;
  if (!routineId) return;
  routines = routines.filter((routine) => routine.id !== routineId);
  saveRoutines();
  showGallery();
});

backToGallery.addEventListener('click', () => {
  showGallery();
});

clearAllButton.addEventListener('click', () => {
  routines = [];
  saveRoutines();
  showGallery();
});

showGallery();
