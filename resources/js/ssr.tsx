import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import ReactDOMServer from 'react-dom/server';
import { type RouteName, route } from 'ziggy-js';

// التعديل هنا ليكون الاسم الافتراضي هو "دكة"
const appName = import.meta.env.VITE_APP_NAME || 'دكة';

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        // هنا يتم دمج اسم الصفحة مع اسم مشروعك "دكة"
        title: (title) => title ? `${title} - ${appName}` : appName,
        resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
        setup: ({ App, props }) => {
            /* eslint-disable */
            // @ts-expect-error
            global.route<RouteName> = (name, params, absolute) =>
                route(name, params as any, absolute, {
                    // @ts-expect-error
                    ...page.props.ziggy,
                    // @ts-expect-error
                    location: new URL(page.props.ziggy.location),
                });
            /* eslint-enable */

            return <App {...props} />;
        },
    }),
);