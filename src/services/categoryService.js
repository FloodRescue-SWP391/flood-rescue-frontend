import { API_BASE_URL,fetchWithAuth } from "./apiClient";

const BASE = `${API_BASE_URL}/Categories`;

export const categoryService = {
    async getAll(){
        const res = await fetchWithAuth(`${BASE}`);
        const data = await res.json()
        return data;//APIResponse<List<CategoryDTO>>
    },

    async getById(id){
        const res = await fetchWithAuth(`${BASE}/${id}`);
        return await res.json();
    },

    async create(payload){
        const res = await fetchWithAuth(`${BASE}`,{
            method: "POST",
            body: JSON.stringify(payload),
        });
        return await res.json();
    },

    async update(id, payload){
        const res = await fetchWithAuth(`${BASE}/${id}`,{
            method: "PUT",
            body: JSON.stringify(payload),
        });
        return await res.json();
    },
    async remove(id){
        const res = await fetchWithAuth(`${BASE}/${id}`,{
            method: "DELETE",
        }); 
        return await res.json();
    }
}   