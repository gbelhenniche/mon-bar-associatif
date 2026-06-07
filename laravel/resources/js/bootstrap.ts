import axios from 'axios';
(window as any).axios = axios;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
