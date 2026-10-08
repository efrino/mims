import { defineStore } from "pinia";
import { ref, computed, reactive } from "vue";
import { useNotificationStore } from "@/stores/notification";
import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";
import { useUtilityStore } from "@/stores/utility";
import { DisplayManagementService } from "@/services/Admin/DisplayManagementService";
import type {
  Display,
  DisplayAndon,
  DisplayFormData,
  DisplayAndonFormData,
  Datatables,
  DatatablesList,
  DialogState,
  ActionType,
  MoveDirection,
  DatatableFilters
} from "@/types/Admin/DisplayManagement";
import { ActionType as ActionTypeEnum, DeviceType as DeviceTypeEnum } from "@/types/Admin/DisplayManagement";

export const useDisplayManagementStore = defineStore("display-management", () => {
  const authStore = useAuthStore();
  const configStore = useConfigStore();
  const notificationStore = useNotificationStore();
  const utilityStore = useUtilityStore();
  const service = new DisplayManagementService(configStore.apiUrl);
  
  const action = ref<ActionType>(ActionTypeEnum.ADD);
  const apiUrl = ref<string>(configStore.apiUrl);
  const permissions = reactive({
    create: authStore.checkAccess("Module.Create.DisplayManagement"),
  });

  const datatables = reactive<Datatables>({
    headers: [
      { text: "ID", align: "left", value: "id" },
      { text: "Andon Name", align: "left", value: "title" },
      { text: "Location", align: "left", value: "location" },
      { text: "Device", align: "left", value: "device" },
      { text: "IP Address", align: "left", value: "ip_address" },
      { text: "Short Link", align: "left", value: "short_link" },
      { text: "Action", align: "left", value: "action" },
    ],
    items: [],
    filters: {
      id: [],
      title: [],
      location: [],
      device: [],
      ip_address: [],
      short_link: [],
    },
  });

  const datatablesList = reactive<DatatablesList>({
    headers: [
      { text: "Order", align: "left", value: "urut" },
      { text: "Andon Name", align: "left", value: "title_andon" },
      { text: "Link", align: "left", value: "link" },
      { text: "Parameter", align: "left", value: "parameter" },
      { text: "Duration (Minutes)", align: "left", value: "duration" },
      { text: "Move Action", align: "center", value: "action" },
      { text: "Delete Action", align: "center", value: "action" },
    ],
    items: [],
    filters: {
      title_andon: [],
      link: [],
      duration: [],
    },
  });

  const table = reactive<{ items: DisplayAndon[] }>({
    items: [],
  });

  const form = ref<string[]>([
    "id",
    "title",
    "location",
    "device",
    "ip_address",
    "short_link",
  ]);

  const dialog = reactive<DialogState>({
    formData: false,
    formListAndon: false,
    formDataGroupAndon: false,
  });

  const formData = reactive<DisplayFormData>({
    id: "",
    title: "",
    location: "",
    device: "",
    ip_address: "",
    short_link: "",
  });

  const formDataAndon = reactive<DisplayAndonFormData>({
    id: "",
    andon_id: "",
    title_andon: "",
    duration: 0,
    parameter: "",
  });

  const list = reactive<{ device: string[] }>({
    device: [DeviceTypeEnum.WINDOWS, DeviceTypeEnum.RASPBERRY_PI],
  });

  const listAndon = ref<DisplayAndon[]>([]);

  const filteredItemsAndon = computed<Display[]>(() => {
    return datatables.items.filter((item) => {
      return Object.keys(datatables.filters).every((filterKey) => {
        const key = filterKey as keyof DatatableFilters;
        const filterValue = datatables.filters[key];
        
        if (filterValue.length < 1) return true;
        
        const itemValue = item[key as keyof Display];
        if (typeof itemValue === 'string') {
          return itemValue
            .toLowerCase()
            .includes(filterValue.join('').toLowerCase());
        }
        return true;
      });
    });
  });

  const resetForm = async (): Promise<void> => {
    await fetchDataAndonManagement();
    Object.assign(formData, {
      id: "",
      title: "",
      location: "",
      device: "",
      ip_address: "",
      short_link: "",
    });

    Object.assign(formDataAndon, {
      id: "",
      title_andon: "",
      andon_id: "",
      duration: "",
      parameter: "",
    });

    datatablesList.items = [];
    dialog.formData = false;
    dialog.formDataGroupAndon = false;
  };

  const fetchDataAndonManagement = async (): Promise<void> => {
    try {
      notificationStore.loading = true;
      const data = await service.fetchDisplays();
      datatables.items = data;
    } catch (error) {
      utilityStore.onError(error);
    } finally {
      notificationStore.disableLoading();
    }
  };

  const loadData = (actionType: ActionType, data: Display): void => {
    formData.id = data.id;
    formData.title = data.title;
    formData.location = data.location;
    formData.device = typeof data.device === 'string' ? data.device : data.device;
    formData.ip_address = data.ip_address;
    formData.short_link = data.short_link;
    
    action.value = actionType;
    dialog.formData = true;
  };

  const loadDataAndon = async (data: Display): Promise<void> => {
    formData.id = data.id;
    formData.title = data.title;
    formData.location = data.location;
    formData.device = typeof data.device === 'string' ? data.device : data.device;
    formData.ip_address = data.ip_address;
    formData.short_link = data.short_link;

    await fetchListDataAndon(data.id);
    dialog.formListAndon = true;
  };

  const addDataAndonGroup = (actionType: ActionType, data: DisplayAndon): void => {
    formDataAndon.id = data.id;
    formDataAndon.andon_id = data.andon_id;
    formDataAndon.title_andon = data.title_andon;
    formDataAndon.duration = data.duration;
    formDataAndon.parameter = data.parameter;

    action.value = actionType;
    dialog.formDataGroupAndon = true;
  };

  const onUpdate = async (): Promise<void> => {
    try {
      notificationStore.loading = true;
      let response;
      
      if (action.value === ActionTypeEnum.EDIT) {
        response = await service.updateDisplay(formData);
      } else {
        response = await service.createDisplay(formData);
      }

      notificationStore.onApiResponseToastAlert(response, resetForm);
    } catch (error) {
      configStore.onError(error);
    } finally {
      await fetchDataAndonManagement();
    }
  };

  const fetchDataDisplayAndon = async (shortlink: string): Promise<void> => {
    try {
      notificationStore.loading = true;
      const data = await service.fetchDisplayAndonByShortlink(shortlink);
      table.items = data;
    } catch (error) {
      utilityStore.onError(error);
    } finally {
      notificationStore.disableLoading();
    }
  };

  const fetchListDataAndon = async (id: string): Promise<void> => {
    try {
      notificationStore.loading = true;
      const data = await service.fetchDisplayAndonById(id);
      datatablesList.items = data;
    } catch (error) {
      utilityStore.onError(error);
    } finally {
      notificationStore.disableLoading();
    }
  };

  const deleteItem = (id: string, title: string, displayId: string): void => {
    notificationStore.showConfirm(
      "Delete Item",
      `Do you really want to delete ${title}?`,
      () => {
        deleteAndon(id, displayId);
      }
    );
  };

  const deleteAndon = async (id: string, displayId: string): Promise<void> => {
    try {
      notificationStore.loading = true;
      const response = await service.deleteDisplayAndon(id);

      if (response.status === 200) {
        notificationStore.showAlertSuccess("Item has been deleted");
        await fetchListDataAndon(displayId);
      } else {
        const message = response.message || "Failed to delete item";
        notificationStore.showAlertError(message);
      }
    } catch (error) {
      configStore.onError(error);
    } finally {
      notificationStore.loading = false;
    }
  };

  const onUpdateAndonGroup = async (id: string): Promise<void> => {
    try {
      notificationStore.loading = true;
      let response;
      
      if (action.value === ActionTypeEnum.EDIT) {
        response = await service.updateAndonGroup(formDataAndon, id);
      } else {
        response = await service.createAndonGroup(formDataAndon, id);
      }

      notificationStore.onApiResponseToastAlert(response, async () => {
        await fetchListDataAndon(id);
        dialog.formDataGroupAndon = false;
      });
    } catch (error) {
      configStore.onError(error);
    } finally {
      notificationStore.disableLoading();
    }
  };

  const fetchListAndon = async (): Promise<void> => {
    try {
      notificationStore.loading = true;
      const data = await service.fetchListAndon();
      listAndon.value = data;
    } catch (error) {
      utilityStore.onError(error);
    } finally {
      notificationStore.disableLoading();
    }
  };

  const onMove = async (
    to: MoveDirection,
    urut: number,
    id: string,
    displayId: string
  ): Promise<void> => {
    try {
      const response = await service.moveAndon(urut, id, to, displayId);
      notificationStore.onApiResponseToastAlert(response, async () => {
        await fetchListDataAndon(displayId);
      });
    } catch (error) {
      configStore.onError(error);
    }
  };

  return {
    action,
    apiUrl,
    permissions,
    datatables,
    datatablesList,
    table,
    form,
    dialog,
    formData,
    formDataAndon,
    list,
    listAndon,
    filteredItemsAndon,
    resetForm,
    fetchDataAndonManagement,
    loadData,
    loadDataAndon,
    addDataAndonGroup,
    onUpdate,
    fetchDataDisplayAndon,
    fetchListDataAndon,
    deleteItem,
    deleteAndon,
    onUpdateAndonGroup,
    fetchListAndon,
    onMove,
  };
});