import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import { piniaPersistedState } from "./plugins/piniaPersistedState";

const pinia = createPinia();
pinia.use(piniaPersistedState);

createApp(App).use(router).use(pinia).mount("#app");
