(function () {
  'use strict';

  // Legacy compatibility shim for older builds that expected a separate
  // booking-static bundle. The live booking experience now lives in site.js.
  window.AgentkaBookingStatic = {
    version: '2.0.0',
    active: true
  };
})();
