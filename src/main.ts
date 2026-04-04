import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import { piniaPersistedState } from "./plugins/piniaPersistedState";
import i18n from "./i18n";
const pinia = createPinia();
pinia.use(piniaPersistedState);

createApp(App).use(router).use(pinia).use(i18n).mount("#app");
