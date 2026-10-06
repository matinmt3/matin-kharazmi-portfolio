/* Public UI showcase. No application credentials or media access. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const on = (id, event, callback) => $(id)?.addEventListener(event, callback);
  const setText = (id, value) => { if ($(id)) $(id).textContent = value; };
  const prefKey = 'visionguard-showcase-preferences-v1';
  let previewStarted = 0;
  let camera = 'back';
  let toastTimer;
  const settingsDialog = $('settingsModalAdvanced');
  const infoDialog = $('previewInfoDialog');
  const featureIds = ['faceDetection', 'audioRecording', 'nightVision', 'motionTracking'];

  function toast(message) {
    const container = $('toastContainerAdvanced');
    const notice = document.createElement('div');
    notice.className = 'toast-advanced info';
    const content = document.createElement('p');
    content.className = 'toast-message-advanced';
    content.textContent = message;
    notice.append(content);
    container.replaceChildren(notice);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => container.replaceChildren(), 5000);
  }

  function openDialog(dialog) {
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
  }
  function info(title, message) {
    setText('previewInfoTitle', title);
    setText('previewInfoText', message);
    openDialog(infoDialog);
  }
  [settingsDialog, infoDialog].forEach(dialog => {
    dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  });

  function chooseCamera(value) {
    camera = value === 'front' ? 'front' : 'back';
    ['back', 'front'].forEach(choice => {
      const button = $(choice === 'back' ? 'backCameraAdvanced' : 'frontCameraAdvanced');
      button.classList.toggle('active', camera === choice);
      button.setAttribute('aria-pressed', String(camera === choice));
    });
    setText('previewCameraLabel', camera === 'back' ? 'نمای دوربین عقب' : 'نمای دوربین جلو');
  }

  function syncSlider(inputId, valueId, fillId, thumbId) {
    const input = $(inputId);
    const value = Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)));
    const percentage = (value - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100;
    input.value = String(value);
    setText(valueId, `${value}%`);
    $(fillId).style.width = `${percentage}%`;
    $(thumbId).style.left = `${percentage}%`;
    input.setAttribute('aria-valuetext', `${value} درصد`);
  }
  const sliders = [
    ['sensitivitySliderAdvanced', 'sensitivityValueAdvanced', 'sliderFillAdvanced', 'sliderThumbAdvanced'],
    ['faceThresholdSlider', 'faceThresholdValue', 'faceSliderFill', 'faceSliderThumb']
  ];
  sliders.forEach(args => on(args[0], 'input', () => syncSlider(...args)));

  function updateNight() {
    $('videoElementAdvanced').classList.toggle('night', $('nightVision').checked);
    $('nightVisionBtn').classList.toggle('active', $('nightVision').checked);
    $('nightVisionBtn').setAttribute('aria-pressed', String($('nightVision').checked));
  }

  function showPage(pageId) {
    ['setupPageAdvanced', 'monitoringPageAdvanced'].forEach(id => $(id).classList.toggle('hidden', id !== pageId));
    const showingDashboard = pageId === 'monitoringPageAdvanced';
    setText('statusTextAdvanced', showingDashboard ? 'داشبورد نمایشی' : 'پیش‌نمایش آماده');
    if (showingDashboard && !previewStarted) previewStarted = Date.now();
    const heading = showingDashboard ? document.querySelector('.preview-monitor-title') : document.querySelector('.setup-title-advanced');
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: 'start' });
  }

  function tabs(buttons, panels) {
    if (!buttons.length) return;
    buttons[0].parentElement.setAttribute('role', 'tablist');
    buttons[0].parentElement.setAttribute('aria-label', panels[0].id === 'photosPanel' ? 'گالری رسانه' : 'تنظیمات نمایشی');
    function activate(index, focus = false) {
      buttons.forEach((button, i) => {
        const active = i === index;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        panels[i].classList.toggle('active', active);
        panels[i].hidden = !active;
      });
      if (focus) buttons[index].focus();
    }
    buttons.forEach((button, index) => {
      if (!button.id) button.id = `preview-tab-${panels[index].id}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panels[index].id);
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].setAttribute('aria-labelledby', button.id);
      panels[index].tabIndex = 0;
      button.addEventListener('click', () => activate(index));
      button.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowLeft') next = (index + 1) % buttons.length;
        if (event.key === 'ArrowRight') next = (index + buttons.length - 1) % buttons.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = buttons.length - 1;
        if (next !== undefined) { event.preventDefault(); activate(next, true); }
      });
    });
    activate(0);
  }
  tabs([$('photosTab'), $('audioTab')], [$('photosPanel'), $('audioPanel')]);
  tabs([...document.querySelectorAll('.settings-tabs-advanced [data-tab]')], [$('messengerPanel'), $('aiPanel'), $('advancedPanel')]);

  function snapshot() {
    return {
      camera,
      motion: Number($('sensitivitySliderAdvanced').value),
      face: Number($('faceThresholdSlider').value),
      light: document.body.classList.contains('preview-light'),
      features: Object.fromEntries(featureIds.map(id => [id, $(id).checked]))
    };
  }
  function applyPreferences(prefs) {
    if (!prefs || typeof prefs !== 'object') return;
    chooseCamera(prefs.camera);
    if (Number.isFinite(prefs.motion)) $('sensitivitySliderAdvanced').value = prefs.motion;
    if (Number.isFinite(prefs.face)) $('faceThresholdSlider').value = prefs.face;
    featureIds.forEach(id => { if (typeof prefs.features?.[id] === 'boolean') $(id).checked = prefs.features[id]; });
    document.body.classList.toggle('preview-light', prefs.light === true);
    $('previewTheme').setAttribute('aria-pressed', String(prefs.light === true));
    $('previewTheme').querySelector('.btn-label').textContent = prefs.light === true ? 'رنگ تیره' : 'رنگ روشن';
    sliders.forEach(args => syncSlider(...args));
    updateNight();
  }

  on('backCameraAdvanced', 'click', () => chooseCamera('back'));
  on('frontCameraAdvanced', 'click', () => chooseCamera('front'));
  on('switchCameraAdvancedBtn', 'click', () => chooseCamera(camera === 'back' ? 'front' : 'back'));
  on('startBtnAdvanced', 'click', () => showPage('monitoringPageAdvanced'));
  on('liveStreamBtn', 'click', () => showPage('monitoringPageAdvanced'));
  on('stopAdvancedBtn', 'click', () => showPage('setupPageAdvanced'));
  on('nightVision', 'change', updateNight);
  on('nightVisionBtn', 'click', () => { $('nightVision').checked = !$('nightVision').checked; updateNight(); });
  ['faceDetection', 'audioRecording', 'motionTracking'].forEach(id => on(id, 'change', () => toast('تنظیم نمایشی تغییر کرد؛ ورودی یا مدلی در این نسخه اجرا نمی‌شود.')));
  on('captureAdvancedBtn', 'click', () => info('عکس‌برداری در طراحی پروژه', 'گالری تصاویر و دکمهٔ عکس‌برداری بخشی از رابط اصلی هستند. پیش‌نمایش هیچ تصویری دریافت یا ثبت نمی‌کند.'));
  on('recordAudioBtn', 'click', () => info('ضبط صدا در طراحی پروژه', 'این نسخه فقط رابط ضبط صدا را نشان می‌دهد. میکروفون فعال نمی‌شود و گالری صدا خالی می‌ماند.'));
  on('analyticsBtn', 'click', () => info('پنل اطلاعات', 'مقادیر داشبورد در این پیش‌نمایش نمایشی هستند. تصویر، صدا، تشخیص چهره یا گزارش عملکرد واقعی دریافت نمی‌شود.'));
  on('alertsAdvancedBtn', 'click', () => info('هشدارها', 'رویدادی در پیش‌نمایش ثبت نشده است. این بخش ساختار رابط هشدارهای پروژه را معرفی می‌کند.'));
  on('shareAdvancedBtn', 'click', () => info('درباره VisionGuard Pro', 'نمونه‌کار محمد متین خوارزمی: طراحی رابط فارسی یک داشبورد نظارت با HTML، CSS و JavaScript. این نسخه برای معرفی ظاهر و تعامل‌های رابط آماده شده است.'));
  on('clearGalleryAdvancedBtn', 'click', () => toast('گالری پیش‌نمایش خالی است؛ رسانه‌ای ثبت نشده است.'));
  on('settingsAdvancedBtn', 'click', () => openDialog(settingsDialog));
  on('closeSettingsModalAdvanced', 'click', () => settingsDialog.close());
  on('closePreviewInfo', 'click', () => infoDialog.close());
  on('saveSettingsAdvancedBtn', 'click', () => {
    try {
      localStorage.setItem(prefKey, JSON.stringify(snapshot()));
      settingsDialog.close();
      toast('ترجیح‌های نمایشی در همین مرورگر ذخیره شدند.');
    } catch { toast('ذخیره در مرورگر در دسترس نیست؛ تغییرهای فعلی همچنان اعمال شده‌اند.'); }
  });
  on('resetSettingsAdvancedBtn', 'click', () => {
    try { localStorage.removeItem(prefKey); } catch { /* Session preferences still reset. */ }
    applyPreferences({ camera: 'back', motion: 65, face: 80, light: false, features: { faceDetection: false, audioRecording: false, nightVision: false, motionTracking: true } });
    toast('تنظیمات نمایشی به حالت اولیه برگشتند.');
  });
  on('previewTheme', 'click', () => {
    const prefs = snapshot();
    prefs.light = !prefs.light;
    applyPreferences(prefs);
  });
  on('fullscreenAdvancedBtn', 'click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else toast('نمایش تمام‌صفحه در این مرورگر در دسترس نیست.');
    } catch { toast('نمایش تمام‌صفحه در این مرورگر در دسترس نیست.'); }
  });

  function updateClock() {
    setText('timeDisplayAdvanced', new Date().toLocaleTimeString('fa-IR'));
    if (previewStarted) {
      const seconds = Math.floor((Date.now() - previewStarted) / 1000);
      setText('uptimeCounterAdvanced', [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0')).join(':'));
    }
  }
  try { applyPreferences(JSON.parse(localStorage.getItem(prefKey) || 'null')); } catch { /* Default safe UI is visible. */ }
  sliders.forEach(args => syncSlider(...args));
  chooseCamera(camera);
  updateNight();
  setText('statusTextAdvanced', 'پیش‌نمایش آماده');
  $('aiLoader').classList.add('hidden');
  $('appContainer').classList.remove('hidden');
  updateClock();
  const clockTimer = setInterval(updateClock, 1000);
  window.addEventListener('pagehide', () => { clearInterval(clockTimer); clearTimeout(toastTimer); });
})();
