async function doLogin() {
  const username = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPass').value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username + '@pwa.co.th',
      password: password,
    });

    if (error) throw error;
    window.location.href = 'dashboard.html';
  } catch (err) {
    alert('เข้าสู่ระบบไม่สำเร็จ: ' + err.message);
  }
}
