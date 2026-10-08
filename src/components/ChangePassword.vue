<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';

const emit = defineEmits<{
  close: [];
}>();

const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const username = ref(authStore.user.username || '');
const firstName = ref(authStore.user.first_name || '');
const lastName = ref(authStore.user.last_name || '');
const email = ref('');
const phone = ref('');
const photoPreview = ref('');
const photoData = ref('');
const photoType = ref('');

onMounted(async () => {
  const profile = await authStore.fetchProfile();
  if (profile) {
    firstName.value = profile.first_name || firstName.value;
    lastName.value = profile.last_name || lastName.value;
    email.value = profile.email || '';
    phone.value = profile.phone || '';
    photoPreview.value = profile.photo || '';
  }
});

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      photoPreview.value = result;
      const [header, data] = result.split(',');
      photoType.value = header.replace('data:', '').replace(';base64', '');
      photoData.value = data;
    };
    reader.readAsDataURL(file);
  }
};

const handleSaveProfile = async () => {
  if (!firstName.value || !lastName.value || !email.value) {
    notificationStore.showDialogWarning('Warning', 'Please fill in first name, last name and email', () => {});
    return;
  }

  const result = await authStore.updateProfile(
    firstName.value,
    lastName.value,
    email.value,
    phone.value,
    photoData.value,
    photoType.value
  );

  if (result.success) {
    photoData.value = '';
    photoType.value = '';
  }
};

const handleSubmit = async () => {
  // Basic validation
  if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
    notificationStore.showDialogWarning('Warning', 'Please fill in all fields', () => {});
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    notificationStore.showDialogWarning('Warning', 'New password and confirm password do not match', () => {});
    return;
  }

  if (newPassword.value.length < 8) {
    notificationStore.showDialogWarning('Warning', 'Password must be at least 8 characters', () => {});
    return;
  }

  // Call the store action to change password
  const result = await authStore.changePassword(
    oldPassword.value,
    newPassword.value,
    confirmPassword.value
  );

  if (result.success) {
    // Reset form and close modal on success
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    emit('close');
  }
};

const handleClose = () => {
  // Reset form
  oldPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  emit('close');
};
</script>

<template>
  <div class="relative bg-white rounded-lg shadow" style="z-index: 99999;">
    <!-- Modal header -->
    <div class="flex items-center justify-between p-4 md:p-5 !border-b !border-gray-200 rounded-t">
      <h3 class="text-xl font-semibold text-gray-900">
        Edit Account
      </h3>
      <button
        type="button"
        @click="handleClose"
        class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
      >
        <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
        </svg>
        <span class="sr-only">Close modal</span>
      </button>
    </div>

    <!-- Modal body -->
    <div class="p-4 md:p-5 max-h-[75vh] overflow-y-auto">
      <!-- Profile -->
      <form class="space-y-4 pb-5 mb-5 !border-b !border-gray-200" @submit.prevent="handleSaveProfile">
        <div class="flex items-center gap-4">
          <img
            v-if="photoPreview"
            :src="photoPreview"
            alt="Photo"
            class="w-20 h-20 shrink-0 object-cover rounded-lg !border !border-gray-300"
          />
          <div class="flex-1 min-w-0">
            <label for="profile-photo" class="block mb-2 text-sm font-medium text-gray-900">
              Photo
            </label>
            <input
              id="profile-photo"
              type="file"
              accept="image/*"
              @change="handleImageUpload"
              class="block w-full text-sm text-gray-900 !border !border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        <div>
          <label for="profile-username" class="block mb-2 text-sm font-medium text-gray-900">
            Username
          </label>
          <input
            v-model="username"
            type="text"
            id="profile-username"
            name="profile-username"
            disabled
            class="bg-gray-100 !border !border-gray-300 text-gray-900 text-md rounded-lg block w-full p-2.5 cursor-not-allowed"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="profile-first-name" class="block mb-2 text-sm font-medium text-gray-900">
              First Name
            </label>
            <input
              v-model="firstName"
              type="text"
              id="profile-first-name"
              name="profile-first-name"
              maxlength="50"
              placeholder="First name"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
              required
            />
          </div>

          <div>
            <label for="profile-last-name" class="block mb-2 text-sm font-medium text-gray-900">
              Last Name
            </label>
            <input
              v-model="lastName"
              type="text"
              id="profile-last-name"
              name="profile-last-name"
              maxlength="50"
              placeholder="Last name"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
              required
            />
          </div>
        </div>

        <div>
          <label for="profile-email" class="block mb-2 text-sm font-medium text-gray-900">
            Email
          </label>
          <input
            v-model="email"
            type="email"
            id="profile-email"
            name="profile-email"
            maxlength="254"
            placeholder="name@example.com"
            class="bg-gray-50 !border !border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
            required
          />
        </div>

        <div>
          <label for="profile-phone" class="block mb-2 text-sm font-medium text-gray-900">
            Phone Number
          </label>
          <input
            v-model="phone"
            type="tel"
            id="profile-phone"
            name="profile-phone"
            maxlength="20"
            placeholder="08xxxxxxxxxx"
            class="bg-gray-50 !border !border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
          />
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
          >
            Save Profile
          </button>
        </div>
      </form>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <!-- Old Password -->
        <div>
          <label for="old-password" class="block mb-2 text-sm font-medium text-gray-900">
            Old Password
          </label>
          <div class="relative">
            <input
              v-model="oldPassword"
              :type="showOldPassword ? 'text' : 'password'"
              id="old-password"
              name="old-password"
              placeholder="Your old password"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5 pr-10"
              required
            />
            <button
              type="button"
              @click="showOldPassword = !showOldPassword"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <svg v-if="!showOldPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </button>
          </div>
        </div>

        <!-- New Password -->
        <div>
          <label for="new-password" class="block mb-2 text-sm font-medium text-gray-900">
            New Password
          </label>
          <div class="relative">
            <input
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              id="new-password"
              name="new-password"
              placeholder="new password"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5 pr-10"
              required
            />
            <button
              type="button"
              @click="showNewPassword = !showNewPassword"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <svg v-if="!showNewPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Confirm Password -->
        <div>
          <label for="confirm-password" class="block mb-2 text-sm font-medium text-gray-900">
            Confirm New Password
          </label>
          <div class="relative">
            <input
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              id="confirm-password"
              name="confirm-password"
              placeholder="confirm password"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5 pr-10"
              required
            />
            <button
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <svg v-if="!showConfirmPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            @click="handleClose"
            class="text-gray-900 bg-white !border !border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
          >
            Change Password
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
