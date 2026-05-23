// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('karma-junit-reporter'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution order
        random: true
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/pawsoft'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcov' }
      ],
      check: {
        global: {
          statements: 45,
          branches: 30,
          functions: 45,
          lines: 45
        }
      }
    },
    reporters: ['progress', 'junit'],
    junitReporter: {
      outputDir: 'test-results',
      outputFile: 'junit-report.xml',
      useBrowserName: false
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true,

    // Configuración específica para pruebas funcionales de PawSoft
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-web-security', '--disable-gpu', '--remote-debugging-port=9222']
      }
    },

    // Configuración de timeouts para pruebas funcionales
    browserDisconnectTimeout: 10000,
    browserDisconnectTolerance: 3,
    browserNoActivityTimeout: 60000,
    captureTimeout: 60000,

    // Configuración para pruebas de servicios HTTP
    proxies: {
      '/api/': 'http://localhost:8080/api/'
    },

    // Archivos a incluir/excluir
    files: [
      // Incluir archivos de configuración global si es necesario
    ],

    // Preprocesadores
    preprocessors: {
      // Configuración de coverage para archivos fuente
      'src/**/*.ts': ['coverage']
    }
  });

  // Configuración específica para CI/CD
  if (process.env.CI) {
    config.browsers = ['ChromeHeadlessCI'];
    config.singleRun = true;
    config.autoWatch = false;
  }
};
