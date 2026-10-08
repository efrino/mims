import { defineStore } from "pinia";
import { useCustomizerStore } from "@/stores/customizer";

export const usePrintOrderShearingStore = defineStore('printOrderShearing', () => {
  const customizer = useCustomizerStore()

  const printA4 = async () => {
    const prevMini = customizer.mini_sidebar
    customizer.mini_sidebar = true

    await new Promise(resolve => setTimeout(resolve, 0))
    setTimeout(() => {
      window.print()
      setTimeout(() => {
        customizer.mini_sidebar = prevMini
      }, 500)
    }, 200)
  }

  return {
    printA4
  }
})