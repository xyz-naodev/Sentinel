/**
 * Firebase Integration Verification Script
 * Add this to browser console to diagnose data flow issues
 */

console.log('=== FIREBASE INTEGRATION DIAGNOSTICS ===\n');

// 1. Check Firebase Web Service
console.log('📊 FIREBASE WEB SERVICE:');
if (typeof firebaseService !== 'undefined') {
  console.log('✅ firebaseService object exists');
  console.log('   - Initialized:', firebaseService.initialized);
  console.log('   - Incidents cached:', firebaseService.incidents?.length || 0);
  console.log('   - Tanod locations cached:', firebaseService.tanodLocations?.length || 0);
  console.log('   - Activity logs cached:', firebaseService.activityLogs?.length || 0);
  
  if (firebaseService.incidents?.length > 0) {
    console.log('   - First incident:', firebaseService.incidents[0]);
  }
} else {
  console.error('❌ firebaseService not defined!');
}

// 2. Check Dashboard Integration
console.log('\n📺 DASHBOARD INTEGRATION:');
if (typeof dashboardIntegration !== 'undefined') {
  console.log('✅ dashboardIntegration object exists');
  console.log('   - Incidents:', dashboardIntegration.incidents?.length || 0);
  console.log('   - Tanod locations:', dashboardIntegration.tanodLocations?.length || 0);
  console.log('   - Incident markers:', dashboardIntegration.markers?.incidents?.length || 0);
  console.log('   - Tanod markers:', dashboardIntegration.markers?.tanods?.length || 0);
} else {
  console.error('❌ dashboardIntegration not defined!');
}

// 3. Check Map
console.log('\n🗺️  GOOGLE MAPS:');
if (window.map) {
  console.log('✅ Map initialized');
  console.log('   - Center:', window.map.getCenter());
  console.log('   - Zoom:', window.map.getZoom());
} else {
  console.error('❌ Map not initialized!');
}

// 4. Check Firebase SDK
console.log('\n🔥 FIREBASE SDK:');
if (typeof firebase !== 'undefined') {
  console.log('✅ Firebase SDK loaded');
  console.log('   - Version:', firebase.SDK_VERSION);
  if (firebase.apps?.length > 0) {
    console.log('   - Apps initialized:', firebase.apps.length);
  }
} else {
  console.error('❌ Firebase SDK not loaded!');
}

// 5. Test Listeners
console.log('\n🔔 TESTING FIREBASE LISTENERS:');
console.log('If you see "Listener fired" messages below, Firebase is working:');
console.log('(Submit a new incident from Flutter to trigger these)');

// Manually test listener
if (firebaseService && firebaseService.initialized) {
  console.log('✅ Setting up temporary test listener...');
  
  // Create a test listener
  firebaseService.database.ref('incidents').limitToLast(1).on('value', (snapshot) => {
    if (snapshot.exists()) {
      console.log('🎉 LISTENER FIRED - Received incident data:', snapshot.val());
    }
  });
}

console.log('\n=== END DIAGNOSTICS ===');
console.log('\n💡 TIPS:');
console.log('1. If Firebase not initialized, check if Firebase SDK loaded');
console.log('2. If listeners don\'t fire, check Firebase security rules');
console.log('3. If map doesn\'t show, check if Google Maps API loaded');
console.log('4. Submit a new incident from Flutter to test real-time sync');
