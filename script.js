'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const formEdit = document.querySelector('.formEdit');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnDeleteAll = document.querySelector('.btn_deleteAll');
let btnDelete;
let btnEdit;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = +distance; //in km
    this.duration = +duration; //in min
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.#calcPace();
    this._setDescription();
  }
  #calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = +elevationGain;
    this.#calcSpeed();
    this._setDescription();
  }
  #calcSpeed() {
    this.speed = this.distance / (this.duration / 60);

    return this.speed;
  }
}
////////////////////////////////////////////////////
//Application Architecture
class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    //get users position
    this.#getPosition();

    //get data from local storage
    this.#getLocalStorage();

    //attach event handlers
    form.addEventListener('submit', this.#newWorkout.bind(this));
    inputType.addEventListener('change', this.#toggleElevationField);
    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));
    btnDeleteAll.addEventListener('click', this.#deleteWorkoutAll.bind(this));
    console.log(this.#workouts);
  }

  #loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13); //13 is the zoom lvl

    //we can change the style by changing this url from org to fr/hot/ for example
    L.tileLayer('https://tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //handling clicks on map
    this.#map.on('click', this.#showForm.bind(this));

    this.#workouts.forEach(work => {
      this.#renderWorkoutMarker(work);
    });
  }

  #showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        ' ';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  #toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this.#loadMap.bind(this)),
        function () {
          alert('Could not get your Position');
        };
  }

  #newWorkout(e) {
    e.preventDefault();
    e.stopPropagation();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    //get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //check input type & valid data
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs must be Numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs must be Numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.#workouts.push(workout);

    this.#renderWorkoutMarker(workout);

    this.#renderWorkout(workout);

    //clear input fields
    this.#hideForm();

    //set local storage to all workouts
    this.#setLocalStorage();

    btnDeleteAll.classList.remove('hidden');
  }

  #renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxwidth: 250,
          minwidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}
      <button class="delete__btn"><img src="Delete-button.svg" border="0"><button class="edit__btn"><img class="img_btn" src="edit_btn.png" border="0"></button>
      </h2>
     
    
      <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      } </span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
      </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running')
      html += `<div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${Number(workout.pace).toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${workout.cadence}</span>
    <span class="workout__unit">spm</span>
  </div>
</li>`;

    if (workout.type === 'cycling')
      html += `<div class="workout__details">
<span class="workout__icon">⚡️</span>
<span class="workout__value">"${Number(workout.speed).toFixed(1)}"</span>
<span class="workout__unit">km/h</span>
</div>
<div class="workout__details">
<span class="workout__icon">⛰</span>
<span class="workout__value">${workout.elevationGain}</span>
<span class="workout__unit">m</span>
</div>
</li>`;

    form.insertAdjacentHTML('afterend', html);

    btnDelete = document.querySelector('.delete__btn');
    //btnEdit = document.querySelector('.edit__btn');

    btnDelete.addEventListener('click', this.#deleteWorkout.bind(this));
    //btnEdit.addEventListener('click', this.#editWorkout.bind(this));
  }

  #moveToPopup(e) {
    const workoutEL = e.target.closest('.workout');
    if (!workoutEL) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEL.dataset.id
    );

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    let workout;
    const workouts = this.#workouts;

    data.forEach(function (work) {
      const type = work.type;
      const distance = +work.distance;
      const duration = +work.duration;
      const lat = work.coords[0];
      const lng = work.coords[1];

      //check input type & valid data
      if (type === 'running') {
        const cadence = +work.cadence;

        workout = new Running([lat, lng], distance, duration, cadence);
        workouts.push(workout);
      }

      if (type === 'cycling') {
        const elevation = +inputElevation.value;

        workout = new Cycling([lat, lng], distance, duration, elevation);
        workouts.push(workout);
      }
    });

    this.#workouts.forEach(work => {
      this.#renderWorkout(work);
    });
    btnDeleteAll.classList.remove('hidden');
  }

  #deleteWorkout(e) {
    e.stopPropagation();
    const workoutEL = e.target.closest('.workout');
    if (!workoutEL) return;

    const workout = this.#workouts.findIndex(
      work => work.id === workoutEL.dataset.id
    );

    const workoutMarker = this.#workouts.find(
      work => work.id === workoutEL.dataset.id
    );

    //this code does not work somehow

    L.marker(workoutMarker.coords).remove();

    this.#map.removeLayer(L.marker(workoutMarker.coords));

    console.log(L.marker(workoutMarker.coords));

    /////////

    workoutEL.remove();

    delete this.#workouts.splice(workout, 1);

    this.#setLocalStorage();
    location.reload();
  }
  /*#editWorkout(e) {
    console.log('edit');
    formEdit.classList.remove('hidden');
    e.preventDefault();
    e.stopPropagation();

    const workoutID = e.target.closest('.workout').dataset.id;

    const workout = this.#workouts.find(work => work.id === workoutID);
    let html;

    inputType.value = workout.type;
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    inputCadence.value = workout.cadence;
    inputElevation.value = workout.elevation;
  }*/
  #deleteWorkoutAll() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
