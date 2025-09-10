import { Route } from "./+types/adminPanel";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Painel Admin" },
    { name: "description", content: "Controle o sua unidade" },
  ];
}

export default function AdminPanel() {
  return (
    <div className="w-full p-4 flex flex-col justify-center">
      <iframe
        title="Sistema_sisub_FINALFINAL"
        height="600"
        src="https://app.powerbi.com/view?r=eyJrIjoiMmQxYjdlMDYtZmE5MC00N2QwLTgxYmItMjRlNWVmMjA3MjgzIiwidCI6ImViMjk0Zjg5LTUwNWUtNDI4MC1iYjdiLTFlMzlhZjg5YTg4YyJ9"
        allowFullScreen
      ></iframe>
    </div>
  );
}
