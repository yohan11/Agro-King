import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function DashboardPage() {
    // Récupère le cookie de session
    const cookieStore = cookies();
    const session = cookieStore.get("agroking_session");

    // Si pas de session → redirection vers /login
    if (!session) {
        redirect("/login");
    }

    // Parse les données de session
    const user = JSON.parse(session.value);

    return (
        <div style={{ padding: "2rem" }}>
            <h1>Bienvenue {user.name} 👋</h1>
            <p>Votre rôle : {user.role}</p>
            <p>Identifiant unique : {user.unique_id}</p>
            <p>Vous êtes connecté avec l’ID : {user.id}</p>
        </div>
    );
}
