const cfg = window.FINORA_SUPABASE_CONFIG;
const client = supabase.createClient(cfg.url, cfg.publishableKey);

const form = document.querySelector('#loginForm');
const msg = document.querySelector('#message');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const signupBtn = document.querySelector('#signupBtn');

function show(text) {
    msg.hidden = false;
    msg.textContent = text;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.hidden = true;

    const { error } = await client.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passwordInput.value
    });

    if (error) {
        show('ورود انجام نشد. ایمیل و رمز عبور را بررسی کنید.');
    } else {
        location.href = 'dashboard.html';
    }
});

signupBtn.onclick = async () => {
    msg.hidden = true;

    if (passwordInput.value.length < 8) {
        return show('رمز عبور باید حداقل ۸ نویسه باشد.');
    }

    const { data, error } = await client.auth.signUp({
        email: emailInput.value.trim(),
        password: passwordInput.value
    });

    if (error) {
        return show(error.message);
    }

    show(data.session ? 'حساب ساخته شد؛ در حال ورود…' : 'حساب ساخته شد. ایمیل تأیید را باز کنید و سپس وارد شوید.');

    if (data.session) {
        setTimeout(() => {
            location.href = 'dashboard.html';
        }, 700);
    }
};

client.auth.getSession().then(({ data }) => {
    if (data.session) {
        location.href = 'dashboard.html';
    }
});
