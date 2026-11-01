import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import bans from "../features/admin/bans/slice";
import players from "../features/admin/players/slice";
import admin from "./admin";

export const store = configureStore({ reducer: { admin, bans, players } });

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
