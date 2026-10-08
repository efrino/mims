<script setup lang="ts">
import { ref } from 'vue';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons-vue';
import { useAuthStore } from '@/stores/auth';
import { Form } from 'vee-validate';

const show1 = ref(false);
const valid = ref(false);
const password = ref('');
const username = ref('');

function validate(values: any, { setErrors }: any) {
  const authStore = useAuthStore();
  authStore.user.username = username.value;
  authStore.user.password = password.value;
  return authStore.login().catch((error) => setErrors({ apiError: error }));
}
</script>

<template>
  <div class="login-wrapper">
    <div class="logo-group">
      <img src="@/assets/images/MAJ-LOGO-3.png" alt="Logo MAJ" class="logo" />
    </div>

    <Form
      @submit="validate"
      class="login-card"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="logo-mims-wrap">
        <img src="@/assets/images/MIMS.png" alt="Logo MIMS" class="logo-mims" />
      </div>

      <div class="field-group">
        <label for="username" class="field-label">Username</label>
        <div class="input-wrapper" :class="{ 'is-filled': username, 'is-error': errors.username }">
          <svg class="field-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            autocomplete="username"
            placeholder="Enter your username"
            class="field-input"
          />
        </div>
        <p v-if="errors.username" class="field-error">{{ errors.username }}</p>
      </div>

      <div class="field-group">
        <label for="password" class="field-label">Password</label>
        <div class="input-wrapper" :class="{ 'is-filled': password, 'is-error': errors.password }">
          <svg class="field-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <input
            id="password"
            v-model="password"
            :type="show1 ? 'text' : 'password'"
            required
            autocomplete="current-password"
            placeholder="Enter your password"
            class="field-input"
          />
          <button
            type="button"
            class="eye-toggle"
            @click="show1 = !show1"
            tabindex="-1"
            :aria-label="show1 ? 'Hide password' : 'Show password'"
          >
            <EyeInvisibleOutlined v-if="!show1" class="eye-icon" />
            <EyeOutlined v-if="show1" class="eye-icon" />
          </button>
        </div>
        <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
      </div>

      <button
        type="submit"
        :disabled="valid || isSubmitting"
        class="submit-btn"
      >
        <svg
          v-if="isSubmitting"
          class="spin-icon"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" style="opacity:0.25"/>
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style="opacity:0.75"/>
        </svg>
        <span>{{ isSubmitting ? 'Signing in...' : 'Sign In' }}</span>
      </button>

      <!-- API Error -->
      <div v-if="errors.apiError" class="api-error" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
        </svg>
        <span>{{ errors.apiError }}</span>
      </div>
    </Form>
  </div>
</template>

<style scoped lang="scss">
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Sora:wght@600;700&display=swap');

.login-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'DM Sans', sans-serif;
}

.logo-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;

  .logo {
    width: 180px;
    object-fit: contain;
  }
}

.logo-mims-wrap {
  margin: -36px -32px 20px -32px;
  line-height: 0; 

  .logo-mims {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 20px 20px 0 0;
  }
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 20px;
  padding: 36px 32px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 10px 40px -4px rgba(0,0,0,0.10);
  overflow: hidden; 
}

.field-group {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  letter-spacing: 0.01em;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border: 1.5px solid #d1d5db;
  border-radius: 12px;
  background: #f9fafb;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;

  &.is-filled {
    border-color: #3b82f6;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.10);
  }

  &:focus-within {
    border-color: #3b82f6;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  &.is-error {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12) !important;
    background: #fff8f8;
  }
}

.field-icon {
  width: 16px;
  height: 16px;
  color: #9ca3af;
  flex-shrink: 0;
  margin-left: 14px;
  transition: color 0.18s ease;

  .input-wrapper:focus-within &,
  .input-wrapper.is-filled & {
    color: #3b82f6;
  }

  .input-wrapper.is-error & {
    color: #ef4444;
  }
}

.field-input {
  flex: 1;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent;
  padding: 13px 44px 13px 14px;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  font-weight: 400;
  color: #111827;

  &::placeholder {
    color: #9ca3af;
    font-weight: 400;
  }

  &:focus {
    font-weight: 500;
  }
}

.eye-toggle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 44px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: transparent;
  border: none;
  border-left: 1px solid #e5e7eb; /* subtle divider between text and icon */
  border-radius: 0 12px 12px 0;
  cursor: pointer;
  padding: 0;
  margin: 6px 0; /* inset vertically so divider doesn't touch top/bottom border */
  transition: background 0.15s ease, border-color 0.18s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  &:focus {
    outline: none;
  }

  .input-wrapper:focus-within &,
  .input-wrapper.is-filled & {
    border-left-color: #bfdbfe;
  }

  .input-wrapper.is-error & {
    border-left-color: #fca5a5;
  }
}

.eye-icon {
  font-size: 15px !important;
  color: #9ca3af;
  transition: color 0.15s ease;

  .eye-toggle:hover & {
    color: #4b5563;
  }

  .input-wrapper:focus-within .eye-toggle & {
    color: #3b82f6;
  }
}

.field-error {
  margin-top: 6px;
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #2563eb;
  color: #ffffff;
  font-family: 'DM Sans', sans-serif;
  font-size: 14.5px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
  letter-spacing: 0.01em;

  &:hover:not(:disabled) {
    background: #1d4ed8;
    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    background: #1e40af;
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spin-icon {
    width: 16px;
    height: 16px;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.api-error {
  margin-top: 16px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  font-size: 13px;
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-top: 1px;
  }
}
</style>

<style lang="scss">
/* ── Mode gelap (html.dark dari stores/theme.ts) — palet slate sama dgn --wui-* ── */
.dark .login-wrapper {
  .login-card {
    background: #1e293b;
    box-shadow: 0 10px 40px -4px rgba(0, 0, 0, 0.5);
  }
  /* Logo MIMS (PNG transparan) teks subjudulnya gelap: tetap di plat putih */
  .logo-mims-wrap { background: #ffffff; padding-bottom: 8px; }
  .field-label { color: #cbd5e1; }
  .input-wrapper {
    border-color: #475569;
    background: #0f172a;
    &.is-filled, &:focus-within { border-color: #3b82f6; background: #0f172a; }
    &.is-error { background: #2a1215; }
  }
  .field-icon, .eye-icon { color: #94a3b8; }
  .field-input {
    color: #f1f5f9;
    &::placeholder { color: #64748b; }
    /* autofill Chrome: jangan jadi kotak abu-abu terang */
    &:-webkit-autofill {
      -webkit-text-fill-color: #f1f5f9;
      -webkit-box-shadow: 0 0 0 1000px #0f172a inset;
      caret-color: #f1f5f9;
    }
  }
  .eye-toggle {
    border-left-color: #334155;
    &:hover { background: rgba(255, 255, 255, 0.06); }
    &:hover .eye-icon { color: #e2e8f0; }
  }
  .input-wrapper:focus-within .eye-toggle, .input-wrapper.is-filled .eye-toggle { border-left-color: #1e3a5f; }
  .api-error { color: #fca5a5; background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.35); }
}
</style>
