import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter } from "react-router"
import { RouterProvider } from "react-router/dom"

import { NotFound } from "./components/States"
import { AppLayout } from "./layouts/AppLayout"
import { MarketingLayout } from "./layouts/MarketingLayout"
import { SessionProvider } from "./lib/session"
import { Landing } from "./pages/Landing"
import "./styles/globals.css"

const router = createBrowserRouter([
  {
    element: <MarketingLayout />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/about", lazy: async () => ({ Component: (await import("./pages/About")).About }) },
      { path: "/docs", lazy: async () => ({ Component: (await import("./pages/Docs")).Docs }) },
      { path: "/login", lazy: async () => ({ Component: (await import("./pages/Login")).Login }) },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      {
        path: "/dashboard",
        lazy: async () => ({ Component: (await import("./pages/FarmPicker")).FarmPicker }),
      },
      {
        path: "/dashboard/:farm",
        lazy: async () => ({ Component: (await import("./pages/FarmDashboard")).FarmDashboard }),
      },
      {
        path: "/seasons/:id",
        lazy: async () => ({ Component: (await import("./pages/Season")).SeasonPage }),
      },
    ],
  },
])

const container = document.getElementById("root")
if (!container) throw new Error("Missing #root element")

createRoot(container).render(
  <StrictMode>
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  </StrictMode>,
)
