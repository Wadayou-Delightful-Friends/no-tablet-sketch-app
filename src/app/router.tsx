import { createBrowserRouter, Navigate } from 'react-router-dom'
import { SelectPage } from '../pages/select/SelectPage'
import { DisplayPage } from '../pages/display/DisplayPage'
import { ControllerPage } from '../pages/controller/ControllerPage'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/select" replace /> },
  { path: '/select', element: <SelectPage /> },
  { path: '/display', element: <DisplayPage /> },
  { path: '/controller', element: <ControllerPage /> },
])
