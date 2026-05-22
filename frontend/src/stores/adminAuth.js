import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api.js";

export const useAdminAuthStore = defineStore("adminAuth", () => {
  const admin = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const isAuthenticated = computed(() => !!admin.value);
  const isSuperAdmin = computed(() => admin.value?.role === "superadmin");

  async function login({ username, password }) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post("/admin/login", { username, password }, { retryOnAuth: false });
      admin.value = data.user;
      return data;
    } catch (err) {
      error.value = err.response?.data?.error?.message || "Login failed";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      await api.post("/admin/logout");
    } finally {
      admin.value = null;
    }
  }

  async function fetchMe() {
    try {
      const { data } = await api.get("/admin/me");
      admin.value = data.admin;
    } catch {
      admin.value = null;
    }
  }

  return { admin, loading, error, isAuthenticated, isSuperAdmin, login, logout, fetchMe };
});
