<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-gray-100 p-6">
    <!-- Header Section with Filters -->
    <div class="max-w-7xl mx-auto mb-6">
      <div class="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Shipping Cycle Management</h1>
            <p class="text-gray-600">Manage shipping cycles and schedules</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <p class="text-sm text-gray-500">Total Cycles</p>
              <p class="text-2xl font-bold text-green-600">{{ filteredData.length }}</p>
            </div>
          </div>
        </div>

        <!-- Filters Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Customer Filter -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Customer
            </label>
            <select
              v-model="filter.customer"
              @change="handleFilterChange"
              class="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 transition-all duration-200 outline-none"
            >
              <option value="">All Customers</option>
              <option v-for="customer in list.customer" :key="customer" :value="customer">
                {{ customer }}
              </option>
            </select>
          </div>

          <!-- Period Filter -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Period
            </label>
            <input
              v-model="filter.period"
              type="month"
              @change="handleFilterChange"
              class="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 transition-all duration-200 outline-none"
            />
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="errorMessage" class="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
          <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="font-semibold text-red-800">Error Loading Data</p>
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- FAB Button -->
    <div class="fixed bottom-8 right-8 z-50">
      <button
        @click="openAddDialog"
        class="w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
        title="Add Cycle"
      >
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Add/Edit Dialog -->
    <div v-if="dialog.form" class="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="dialog.form = false" />

      <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl z-10 overflow-hidden">
        <!-- Header -->
        <div class="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-green-500 to-green-600 opacity-10"></div>

        <div class="relative flex items-center justify-between p-6 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-2xl font-bold text-gray-900">{{ action }} Cycle</h3>
              <p class="text-sm text-gray-500 mt-0.5">Enter cycle information below</p>
            </div>
          </div>
          <button
            @click="dialog.form = false"
            class="w-10 h-10 hover:bg-gray-100 rounded-xl transition-all duration-200 flex items-center justify-center"
          >
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Customer -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                Customer
              </label>
              <select
                v-model="formData.customer"
                :disabled="action === 'Edit'"
                class="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 transition-all duration-200 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Customer</option>
                <option v-for="customer in list.customer" :key="customer" :value="customer">
                  {{ customer }}
                </option>
              </select>
            </div>

            <!-- Cycle -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Cycle
              </label>
              <input
                v-model="formData.cycle"
                type="text"
                :disabled="action === 'Edit'"
                autocomplete="off"
                placeholder="Enter cycle name"
                class="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 transition-all duration-200 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <!-- ETD -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ETD (Estimated Time of Departure)
              </label>
              <input
                v-model="formData.etd"
                type="time"
                class="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 transition-all duration-200 outline-none"
              />
            </div>

            <!-- ETA -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ETA (Estimated Time of Arrival)
              </label>
              <input
                v-model="formData.eta"
                type="time"
                class="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 transition-all duration-200 outline-none"
              />
            </div>
          </div>

          <!-- Form Validation Errors -->
          <div v-if="formErrors.length > 0" class="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <p class="font-semibold text-red-800 mb-2">Please fix the following errors:</p>
            <ul class="list-disc list-inside text-sm text-red-700 space-y-1">
              <li v-for="(error, index) in formErrors" :key="index">{{ error }}</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end items-center gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <button
            @click="dialog.form = false"
            class="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border-2 border-gray-300 transition-all duration-200 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
          <button
            @click="handleSave"
            :disabled="isSaving"
            class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-md transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="!isSaving" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <div class="max-w-7xl mx-auto">
      <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <!-- Loading State -->
        <div v-if="isLoading" class="p-12 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 mb-4">
            <svg class="animate-spin h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p class="text-gray-600 font-medium">Loading data...</p>
        </div>

        <!-- Table -->
        <div v-else>
          <!-- Search Bar -->
          <div class="p-6 border-b border-gray-100">
            <div class="relative">
              <svg
                class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search cycles, ETD, or ETA..."
                class="w-full pl-12 pr-4 py-3.5 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 transition-all duration-200 outline-none placeholder-gray-400"
              />
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Cycle
                    </div>
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      ETD
                    </div>
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      ETA
                    </div>
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="item in paginatedData"
                  :key="item.cycle"
                  class="hover:bg-gradient-to-r hover:from-green-50/50 hover:to-transparent transition-all duration-200"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm font-semibold text-gray-900">{{ item.cycle }}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {{ item.etd }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {{ item.eta }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <button
                        @click="openEditDialog(item)"
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center gap-2"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit
                      </button>
                      <button
                        @click="confirmDelete(item)"
                        class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center gap-2"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Empty State -->
                <tr v-if="filteredData.length === 0">
                  <td colspan="4" class="px-6 py-12">
                    <div class="text-center">
                      <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p class="text-gray-500 font-medium text-lg mb-1">No cycles found</p>
                      <p class="text-gray-400 text-sm">Try adjusting your filters or add a new cycle</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="filteredData.length > itemsPerPage" class="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p class="text-sm text-gray-600">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredData.length) }} of
              {{ filteredData.length }} results
            </p>
            <div class="flex items-center gap-2">
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border-2 border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span class="px-4 py-2 text-sm font-semibold text-gray-700"> Page {{ currentPage }} of {{ totalPages }} </span>
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border-2 border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div v-if="dialog.delete" class="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="dialog.delete = false" />

      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div class="p-6">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Delete Cycle</h3>
          <p class="text-gray-600 mb-6">
            Are you sure you want to delete cycle <strong>{{ itemToDelete?.cycle }}</strong
            >? This action cannot be undone.
          </p>
          <div class="flex items-center gap-3">
            <button
              @click="dialog.delete = false"
              class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200"
            >
              Cancel
            </button>
            <button
              @click="handleDelete"
              :disabled="isDeleting"
              class="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg v-if="!isDeleting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <svg v-else class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {{ isDeleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useControlPrepare } from '@/pinia/admin/inventory/controlPrepare.js';
import { mapActions, mapState, mapWritableState } from 'pinia';
import { useNotificationStore } from '@/pinia/notification';

export default {
  setup() {
    const notificationStore = useNotificationStore();
    return { notificationStore };
  },

  data() {
    return {
      searchQuery: '',
      currentPage: 1,
      itemsPerPage: 10,
      isLoading: false,
      isSaving: false,
      isDeleting: false,
      errorMessage: '',
      formErrors: [],
      itemToDelete: null
    };
  },

  computed: {
    ...mapState(useControlPrepare, ['datatables', 'formData', 'filter', 'list']),
    ...mapWritableState(useControlPrepare, ['action', 'dialog']),

    filteredData() {
      let data = this.datatables.items || [];

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        data = data.filter(
          (item) =>
            (item.cycle || '').toLowerCase().includes(query) ||
            (item.etd || '').toLowerCase().includes(query) ||
            (item.eta || '').toLowerCase().includes(query)
        );
      }

      return data;
    },

    paginatedData() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredData.slice(start, end);
    },

    totalPages() {
      return Math.ceil(this.filteredData.length / this.itemsPerPage);
    }
  },

  watch: {
    searchQuery() {
      this.currentPage = 1;
    },
    'filter.customer'() {
      this.currentPage = 1;
    },
    'filter.period'() {
      this.currentPage = 1;
    }
  },

  mounted() {
    this.loadInitialData();
  },

  methods: {
    ...mapActions(useControlPrepare, ['fetchAllCycle', 'loadDataMasterCycle', 'onUpdate', 'resetForm', 'deletePart']),

    async loadInitialData() {
      try {
        this.isLoading = true;
        this.errorMessage = '';

        if (!this.filter.customer && this.list.customer && this.list.customer.length > 0) {
          this.filter.customer = this.list.customer[0];
        }

        await this.fetchAllCycle();

        if (!this.datatables.items || this.datatables.items.length === 0) {
          console.warn('No data returned from API');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        this.errorMessage = error.message || 'Failed to load data. Please try again.';
      } finally {
        this.isLoading = false;
      }
    },

    async handleFilterChange() {
      try {
        this.isLoading = true;
        this.errorMessage = '';
        await this.fetchAllCycle();
      } catch (error) {
        console.error('Error applying filter:', error);
        this.errorMessage = error.message || 'Failed to apply filter. Please try again.';
      } finally {
        this.isLoading = false;
      }
    },

    openAddDialog() {
      this.resetForm();
      this.action = 'Add';
      this.dialog.form = true;
      this.formErrors = [];
    },

    openEditDialog(item) {
      this.loadDataMasterCycle('Edit', item);
      this.formErrors = [];
    },

    validateForm() {
      this.formErrors = [];

      if (!this.formData.customer) {
        this.formErrors.push('Customer is required');
      }

      if (!this.formData.cycle || this.formData.cycle.trim() === '') {
        this.formErrors.push('Cycle is required');
      }

      if (!this.formData.etd) {
        this.formErrors.push('ETD (Estimated Time of Departure) is required');
      }

      if (!this.formData.eta) {
        this.formErrors.push('ETA (Estimated Time of Arrival) is required');
      }

      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (this.formData.etd && !timeRegex.test(this.formData.etd)) {
        this.formErrors.push('ETD must be in valid time format (HH:MM)');
      }

      if (this.formData.eta && !timeRegex.test(this.formData.eta)) {
        this.formErrors.push('ETA must be in valid time format (HH:MM)');
      }

      return this.formErrors.length === 0;
    },

    async handleSave() {
      if (!this.validateForm()) {
        return;
      }

      try {
        this.isSaving = true;
        this.errorMessage = '';

        await this.onUpdate();

        if (this.notificationStore) {
          this.notificationStore.showSuccess('Success', `Cycle ${this.action === 'Add' ? 'added' : 'updated'} successfully`);
        }

        this.dialog.form = false;
        await this.handleFilterChange();
      } catch (error) {
        console.error('Error saving data:', error);

        if (this.notificationStore) {
          this.notificationStore.showError('Error', error.message || `Failed to ${this.action.toLowerCase()} cycle. Please try again.`);
        } else {
          this.errorMessage = error.message || `Failed to ${this.action.toLowerCase()} cycle. Please try again.`;
        }
      } finally {
        this.isSaving = false;
      }
    },

    confirmDelete(item) {
      this.itemToDelete = item;
      this.dialog.delete = true;
    },

    async handleDelete() {
      if (!this.itemToDelete) return;

      try {
        this.isDeleting = true;
        this.errorMessage = '';

        await this.deletePart(this.itemToDelete.cycle, this.itemToDelete.customer);

        if (this.notificationStore) {
          this.notificationStore.showSuccess('Success', `Cycle ${this.itemToDelete.cycle} deleted successfully`);
        }

        this.dialog.delete = false;
        this.itemToDelete = null;
        await this.handleFilterChange();
      } catch (error) {
        console.error('Error deleting data:', error);

        if (this.notificationStore) {
          this.notificationStore.showError('Error', error.message || 'Failed to delete cycle. Please try again.');
        } else {
          this.errorMessage = error.message || 'Failed to delete cycle. Please try again.';
        }
      } finally {
        this.isDeleting = false;
      }
    }
  }
};
</script>

<style scoped>
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #16a34a;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #15803d;
}

button {
  user-select: none;
}

button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid #16a34a;
  outline-offset: 2px;
}
</style>
