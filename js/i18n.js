// Тексты интерфейса на двух языках.
// Чтобы поправить формулировку — меняйте строку здесь, код трогать не нужно.

const ru = {
  appName: 'Помидорки',
  tabTimer: 'Таймер',
  tabRewards: 'Награды',
  tabSettings: 'Настройки',

  homeTitle: 'Привет!',
  homeSubtitle: 'Сколько сил сегодня? Выбери помидорку.',
  start: 'Начать!',
  workRest: (w, r) => `${w} мин · отдых ${r}`,
  restShort: (r) => `отдых ${r} мин`,
  todayDone: (n) => n > 0 ? `Сегодня уже ${n} ${plural(n, 'помидорка', 'помидорки', 'помидорок')}` : '',

  varieties: {
    cherry: 'Черри',
    plum: 'Сливка',
    yellow: 'Солнышко',
    oxheart: 'Бычье сердце',
  },

  phaseWork: 'Работаем',
  phaseAwait: 'Время работы вышло',
  phaseRest: 'Отдыхаем',
  phaseLongRest: 'Большой отдых',
  phasePaused: 'Пауза',
  tomatoesDone: (n) => `${n} ${plural(n, 'помидорка', 'помидорки', 'помидорок')}`,

  pause: 'Пауза',
  resume: 'Продолжить',
  sound: 'Звук',
  readyToRest: 'Готов отдохнуть?',
  readyHint: 'Закончи предложение или пример — и жми!',
  backToWork: 'А теперь за работу!',
  oneMoreMinute: 'Ещё минутку',
  minutesLeft: (n) => `осталось: ${n}`,
  done: 'Готово!',
  exit: 'Выйти',

  confirmDoneTitle: 'Вся работа сделана?',
  confirmDoneYes: 'Да, всё сделано!',
  confirmDoneNo: 'Ещё нет',
  confirmExitTitle: 'Выйти без награды?',
  confirmExitText: 'Таймер остановится, а награда не начислится.',
  confirmExitYes: 'Выйти',
  confirmExitNo: 'Остаться',

  rewardHooray: 'Ура!',
  rewardSummary: (c, m) => `${c} ${plural(c, 'помидорка', 'помидорки', 'помидорок')} · ${m} ${plural(m, 'минута', 'минуты', 'минут')} работы`,
  rewardToCalendar: 'Мои награды',
  rewardHome: 'На главную',

  awards: {
    lightning: { title: 'Как молния!', rule: 'до 3 помидорок' },
    strong: { title: 'Сильный характер!', rule: '4–7 помидорок' },
    marathon: { title: 'Марафонец!', rule: '8 и больше помидорок' },
  },

  rewardsTitle: 'Мои награды',
  statTomatoes: 'Помидорки',
  statMinutes: 'Минуты работы',
  statAwards: 'Награды',
  statStreak: 'Дни подряд',
  weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  prevMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',
  dayEmpty: 'В этот день наград нет',

  settingsTitle: 'Настройки',
  secLanguage: 'Язык',
  secSound: 'Звуки',
  secSensory: 'Спокойный режим',
  secScreen: 'Экран',
  secData: 'Данные',

  bgSound: 'Фон во время работы',
  bgOff: 'Тишина',
  bgRain: 'Дождь',
  bgWhite: 'Белый шум',
  bgBrown: 'Мягкий шум',
  bgLofi: 'Lo-fi музыка',
  bgFire: 'Камин',
  restMusic: 'Музыка на отдыхе',
  restOff: 'Тишина',
  restSynth: 'Весёлая мелодия',
  restFile: 'Танцевальная музыка',
  whistle: 'Помидорка насвистывает',
  bgVolume: 'Громкость фона',
  signals: 'Сигналы',
  signalsHint: 'Конец работы, отсчёт, награда',
  signalVolume: 'Громкость сигналов',
  ticks: 'Тиканье при отсчёте 10…0',

  motion: 'Анимация',
  motionFull: 'Обычная',
  motionCalm: 'Мягкая',
  motionOff: 'Без движения',
  motionHint: 'Мягкая — медленнее и без конфетти. Без движения — только смена картинок.',
  vibration: 'Вибрация',
  vibrationHint: 'Короткая вибрация при смене этапа (на Android)',
  wakeLock: 'Не гасить экран',
  wakeLockHint: 'Пока идёт таймер',

  resetData: 'Стереть все награды',
  resetConfirmTitle: 'Стереть все награды?',
  resetConfirmText: 'Календарь и счётчики очистятся. Это нельзя отменить.',
  resetYes: 'Стереть',
  resetNo: 'Отмена',

  install: 'Как установить на телефон',
  installText: 'Android: меню браузера → «Добавить на главный экран». iPhone/iPad: кнопка «Поделиться» → «На экран „Домой“».',
};

const en = {
  appName: 'Tomatoes',
  tabTimer: 'Timer',
  tabRewards: 'Rewards',
  tabSettings: 'Settings',

  homeTitle: 'Hi there!',
  homeSubtitle: 'How much energy today? Pick a tomato.',
  start: 'Start!',
  workRest: (w, r) => `${w} min · break ${r}`,
  restShort: (r) => `${r} min break`,
  todayDone: (n) => n > 0 ? `${n} ${n === 1 ? 'tomato' : 'tomatoes'} today` : '',

  varieties: {
    cherry: 'Cherry',
    plum: 'Plum',
    yellow: 'Sunny',
    oxheart: 'Oxheart',
  },

  phaseWork: 'Working',
  phaseAwait: 'Work time is up',
  phaseRest: 'Break time',
  phaseLongRest: 'Long break',
  phasePaused: 'Paused',
  tomatoesDone: (n) => `${n} ${n === 1 ? 'tomato' : 'tomatoes'}`,

  pause: 'Pause',
  resume: 'Resume',
  sound: 'Sound',
  readyToRest: 'Ready for a break?',
  readyHint: 'Finish your sentence or problem, then tap!',
  backToWork: 'Back to work!',
  oneMoreMinute: 'One more minute',
  minutesLeft: (n) => `${n} left`,
  done: 'Done!',
  exit: 'Exit',

  confirmDoneTitle: 'Is all the work done?',
  confirmDoneYes: 'Yes, all done!',
  confirmDoneNo: 'Not yet',
  confirmExitTitle: 'Exit without a reward?',
  confirmExitText: 'The timer will stop and no reward will be given.',
  confirmExitYes: 'Exit',
  confirmExitNo: 'Stay',

  rewardHooray: 'Hooray!',
  rewardSummary: (c, m) => `${c} ${c === 1 ? 'tomato' : 'tomatoes'} · ${m} ${m === 1 ? 'minute' : 'minutes'} of work`,
  rewardToCalendar: 'My rewards',
  rewardHome: 'Home',

  awards: {
    lightning: { title: 'Quick as lightning!', rule: 'up to 3 tomatoes' },
    strong: { title: 'Strong will!', rule: '4–7 tomatoes' },
    marathon: { title: 'Marathon runner!', rule: '8 or more tomatoes' },
  },

  rewardsTitle: 'My rewards',
  statTomatoes: 'Tomatoes',
  statMinutes: 'Minutes of work',
  statAwards: 'Rewards',
  statStreak: 'Days in a row',
  weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  dayEmpty: 'No rewards on this day',

  settingsTitle: 'Settings',
  secLanguage: 'Language',
  secSound: 'Sounds',
  secSensory: 'Calm mode',
  secScreen: 'Screen',
  secData: 'Data',

  bgSound: 'Background while working',
  bgOff: 'Silence',
  bgRain: 'Rain',
  bgWhite: 'White noise',
  bgBrown: 'Soft noise',
  bgLofi: 'Lo-fi music',
  bgFire: 'Fireplace',
  restMusic: 'Music during breaks',
  restOff: 'Silence',
  restSynth: 'Happy tune',
  restFile: 'Dance music',
  whistle: 'Tomato whistles',
  bgVolume: 'Background volume',
  signals: 'Signals',
  signalsHint: 'End of work, countdown, reward',
  signalVolume: 'Signal volume',
  ticks: 'Ticking during 10…0 countdown',

  motion: 'Animation',
  motionFull: 'Normal',
  motionCalm: 'Gentle',
  motionOff: 'No motion',
  motionHint: 'Gentle: slower and no confetti. No motion: pictures change, nothing moves.',
  vibration: 'Vibration',
  vibrationHint: 'Short buzz when the stage changes (Android)',
  wakeLock: 'Keep screen on',
  wakeLockHint: 'While the timer is running',

  resetData: 'Erase all rewards',
  resetConfirmTitle: 'Erase all rewards?',
  resetConfirmText: 'The calendar and counters will be cleared. This cannot be undone.',
  resetYes: 'Erase',
  resetNo: 'Cancel',

  install: 'How to install on a phone',
  installText: 'Android: browser menu → “Add to Home screen”. iPhone/iPad: Share button → “Add to Home Screen”.',
};

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const dictionaries = { ru, en };
