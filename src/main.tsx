import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter } from "react-router"
import { RouterProvider } from "react-router/dom"

import { NotFound } from "./components/States"
import { AppLayout } from "./layouts/AppLayout"
import { MarketingLayout } from "./layouts/MarketingLayout"
import { SessionProvider } from "./lib/session"
import { About } from "./pages/About"
import { Docs } from "./pages/Docs"
import { FarmDashboard } from "./pages/FarmDashboard"
import { FarmPicker } from "./pages/FarmPicker"
import { Landing } from "./pages/Landing"
import { Login } from "./pages/Login"
import { SeasonPage } from "./pages/Season"
import "./styles/globals.css"

const router = createBrowserRouter([
  {
    element: <MarketingLayout />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/about", element: <About /> },
      { path: "/docs", element: <Docs /> },
      { path: "/login", element: <Login /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: "/dashboard", element: <FarmPicker /> },
      { path: "/dashboard/:farm", element: <FarmDashboard /> },
      { path: "/seasons/:id", element: <SeasonPage /> },
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
