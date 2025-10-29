const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_SETTINGS = {
  isSetupComplete: false,
  printer: null,
};

const getConfigFilePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'settings.json');
};

let cachedSettings;

const readSettingsFromDisk = () => {
  try {
    const data = fs.readFileSync(getConfigFilePath(), 'utf8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { ...DEFAULT_SETTINGS };
    }
    throw error;
  }
};

const writeSettingsToDisk = (settings) => {
  fs.mkdirSync(path.dirname(getConfigFilePath()), { recursive: true });
  fs.writeFileSync(getConfigFilePath(), JSON.stringify(settings, null, 2), 'utf8');
};

const getSettings = () => {
  if (!cachedSettings) {
    cachedSettings = readSettingsFromDisk();
  }
  return cachedSettings;
};

const updateSettings = (partial) => {
  const nextSettings = {
    ...getSettings(),
    ...partial,
  };
  writeSettingsToDisk(nextSettings);
  cachedSettings = nextSettings;
  return nextSettings;
};

module.exports = {
  getSettings,
  updateSettings,
  getConfigFilePath,
};
