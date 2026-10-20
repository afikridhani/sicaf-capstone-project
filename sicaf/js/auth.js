// Halaman login dan registrasi

async function submitWithButton(form, task) {
  const button = form.querySelector("button[type=submit]");
  const label = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="ri-loader-4-line"></i> Memproses...';

  try {
    await task();
  } catch (error) {
    showError(error, "Gagal");
  } finally {
    button.disabled = false;
    button.innerHTML = label;
  }
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  // Jika sesi masih aktif, langsung masuk ke aplikasi
  apiRequest("me.php").then(() => (window.location.href = "app.html")).catch(() => {});

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm));

    submitWithButton(loginForm, async () => {
      await apiRequest("login.php", { method: "POST", body: data });
      window.location.href = "app.html";
    });
  });

  document.querySelectorAll("[data-demo]").forEach((button) => {
    button.addEventListener("click", () => {
      loginForm.email.value = button.dataset.demo;
      loginForm.password.value = "password123";
      loginForm.requestSubmit();
    });
  });
}

const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(registerForm));

    if (data.password !== data.konfirmasi) {
      swal({ icon: "warning", title: "Password tidak sama", text: "Ulangi konfirmasi password." });
      return;
    }

    submitWithButton(registerForm, async () => {
      const result = await apiRequest("register.php", { method: "POST", body: data });
      await swal({ icon: "success", title: "Registrasi Berhasil", text: result.message, confirmButtonText: "Ke halaman login" });
      window.location.href = "login.html";
    });
  });
}
