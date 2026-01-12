document.querySelector('.login-btn').addEventListener('click', function() {
  const username = document.querySelector('input[placeholder="Username"]').value.trim();
  const password = document.querySelector('input[placeholder="Password"]').value.trim();

  // Updated validation logic
  if (username === 'admin' && password === 'sentinel2025') {
    window.location.href = '../html/dashboard.html';
  } else {
    alert('Invalid username or password.');
  }
});