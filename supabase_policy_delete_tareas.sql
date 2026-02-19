-- Permitir eliminar tareas solo a admin y farmaceutico
create policy "Permitir eliminar tareas solo admin y farmaceutico"
  on public.tareas_reenvasado
  for delete
  to authenticated
  using (
    exists (
      select 1 from perfiles
      where perfiles.user_id = auth.uid()
      and (perfiles.rol = 'admin' or perfiles.rol = 'farmaceutico')
    )
  );
