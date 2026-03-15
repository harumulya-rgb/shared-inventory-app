import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';

const ProfileContext = createContext();

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
};

export const ProfileProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [session, setSession] = useState(null);
    const [currentProfile, setCurrentProfile] = useState(null);
    const [profilesList, setProfilesList] = useState([]);

    // Profile Data States
    const [fields, setFields] = useState([]);
    const [activities, setActivities] = useState([]);
    const [workgroups, setWorkgroups] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [materialCategories, setMaterialCategories] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [materialLogs, setMaterialLogs] = useState([]);
    const [allEntries, setAllEntries] = useState([]);
    const [systemDestinations, setSystemDestinations] = useState({ fieldId: null, activityId: null });

    const fetchProfileData = useCallback(async (profileId) => {
        if (!profileId) return;
        
        const fReq = supabase.from('fields').select('id, name').eq('profile_id', profileId);
        const aReq = supabase.from('activities').select('id, name, unit, category').eq('profile_id', profileId);
        const wReq = supabase.from('workgroups').select('id, name').eq('profile_id', profileId);
        const mReq = supabase.from('materials').select('id, name, unit, price, category, material_no').eq('profile_id', profileId);
        const mcReq = supabase.from('material_categories').select('*').eq('profile_id', profileId);
        const wrkReq = supabase.from('workers').select('id, name, status').eq('profile_id', profileId);
        const vehReq = supabase.from('vehicles').select('id, name, type, registration_no').eq('profile_id', profileId);
        const mlReq = supabase.from('material_price_logs').select('material_id, price, changed_at').eq('profile_id', profileId);
        const eReq = supabase.from('entries').select('*').eq('profile_id', profileId).order('date', { ascending: false });

        const [fRes, aRes, wRes, mRes, mcRes, wrkRes, vehRes, mlRes, eRes] = await Promise.all([fReq, aReq, wReq, mReq, mcReq, wrkReq, vehReq, mlReq, eReq]);

        let currentFields = fRes.data || [];
        let currentActivities = aRes.data || [];

        // Ensure System default destinations for inventory tracking exist
        let sysField = currentFields.find(f => f.name === '[SYSTEM] Inventory Store');
        if (!sysField) {
            const { data } = await supabase.from('fields').insert([{ profile_id: profileId, name: '[SYSTEM] Inventory Store', size: 0 }]).select().single();
            if (data) { sysField = data; currentFields.push(data); }
        }

        let sysAct = currentActivities.find(a => a.name === '[SYSTEM] Stock Receipt');
        if (!sysAct) {
            const { data } = await supabase.from('activities').insert([{ profile_id: profileId, name: '[SYSTEM] Stock Receipt', unit: 'N/A', rate: 0 }]).select().single();
            if (data) { sysAct = data; currentActivities.push(data); }
        }

        setSystemDestinations({ fieldId: sysField?.id, activityId: sysAct?.id });

        setFields(currentFields);
        setActivities(currentActivities);
        if (wRes.data) setWorkgroups(wRes.data);
        if (mRes.data) setMaterials(mRes.data);
        if (mcRes.data) setMaterialCategories(mcRes.data);
        if (wrkRes.data) setWorkers(wrkRes.data);
        if (vehRes.data) setVehicles(vehRes.data);
        if (mlRes.data) setMaterialLogs(mlRes.data);
        if (eRes.data) setAllEntries(eRes.data);
    }, []);

    const refreshProfileData = useCallback(async () => {
        if (currentProfile) await fetchProfileData(currentProfile.id);
    }, [currentProfile, fetchProfileData]);

    const fetchProfiles = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching profiles:", error);
        } else if (data) {
            setProfilesList(data);

            if (data.length > 0) {
                const savedId = localStorage.getItem('lastProfileId');

                setCurrentProfile(prevProfile => {
                    const currentStillExists = prevProfile ? data.find(p => p.id === prevProfile.id) : undefined;

                    if (currentStillExists) {
                        return currentStillExists;
                    } else if (savedId) {
                        const savedProfile = data.find(p => p.id === savedId);
                        if (savedProfile) {
                            return savedProfile;
                        } else {
                            localStorage.setItem('lastProfileId', data[0].id);
                            return data[0];
                        }
                    } else {
                        localStorage.setItem('lastProfileId', data[0].id);
                        return data[0];
                    }
                });
            } else {
                setCurrentProfile(null);
                localStorage.removeItem('lastProfileId');
            }
        }
        setIsLoading(false);
    }, []);

    // Session Management
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: fetchedSession } }) => {
            setSession(fetchedSession);
            if (fetchedSession) fetchProfiles();
            else setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (newSession?.user?.id !== session?.user?.id) {
                    setSession(newSession);
                    if (newSession) fetchProfiles();
                }
            } else if (event === 'SIGNED_OUT') {
                setSession(null);
                setCurrentProfile(null);
                setProfilesList([]);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchProfiles, session?.user?.id]);

    // Data Management
    useEffect(() => {
        // Also fetch the contextual data for the selected profile
        if (session && currentProfile) {
            fetchProfileData(currentProfile.id);
        }
    }, [currentProfile, session, fetchProfileData]);

    const switchProfile = (profileData) => {
        setCurrentProfile(profileData);
        localStorage.setItem('lastProfileId', profileData.id);
    };

    const createProfile = async (name) => {
        if (!session) return;
        const { data, error } = await supabase
            .from('profiles')
            .insert([{ name, user_id: session.user.id }])
            .select()
            .single();

        if (error) {
            console.error("Error creating profile:", error);
            alert(error.message);
            return;
        }
        
        setCurrentProfile(data);
        setProfilesList(prev => [...prev, data]);
    };

    const joinEstate = async (key) => {
        if (!session) return;
        try {
            const { error } = await supabase.rpc('join_estate_by_key', { p_id: key });
            if (error) throw error;
            alert("Successfully joined Estate!");
            await fetchProfiles();
        } catch (error) {
            console.error("Join Error:", error);
            alert(`Failed to join: ${error.message}`);
        }
    };
    const deleteEntry = async (id) => {
        const { error } = await supabase.from('entries').delete().eq('id', id);
        if (!error) await refreshProfileData();
        return { error };
    };

    const updateEntry = async (id, payload) => {
        const { error } = await supabase.from('entries').update(payload).eq('id', id);
        if (!error) await refreshProfileData();
        return { error };
    };

    // Material Category CRUD
    const addMaterialCategory = async (name) => {
        const trimmedName = name.trim();
        if (!currentProfile || !trimmedName) return;

        // Case-insensitive existence check against local state
        const existing = materialCategories.find(mc => mc.name.toLowerCase() === trimmedName.toLowerCase());
        if (existing) return existing;

        const { data, error } = await supabase.from('material_categories').insert([{ name: trimmedName, profile_id: currentProfile.id }]).select().single();
        if (!error && data) {
            setMaterialCategories(prev => [...prev, data]);
            return data;
        }

        if (error) {
            // Handle race condition: check if it was just added by another process
            if (error.code === '23505') {
                const { data: retryData } = await supabase.from('material_categories').select().eq('profile_id', currentProfile.id).ilike('name', trimmedName).single();
                if (retryData) return retryData;
            }
            alert('Failed to add category: ' + error.message);
        }
    };

    const deleteMaterialCategory = async (id) => {
        const { error } = await supabase.from('material_categories').delete().eq('id', id);
        if (!error) {
            setMaterialCategories(prev => prev.filter(mc => mc.id !== id));
        } else {
            alert('Failed to delete category: ' + error.message);
        }
    };

    const updateMaterialCategory = async (id, name, oldName) => {
        if (!currentProfile) return;
        const { data, error } = await supabase.from('material_categories').update({ name }).eq('id', id).select().single();
        if (!error && data) {
            setMaterialCategories(prev => prev.map(mc => mc.id === id ? data : mc));
            if (oldName) {
                // Cascading update for materials in this category
                await supabase.from('materials').update({ category: name }).eq('profile_id', currentProfile.id).eq('category', oldName);
                await refreshProfileData();
            }
        } else if (error) {
            alert('Failed to update category: ' + error.message);
        }
    };

    const value = useMemo(() => ({
        isLoading,
        session,
        currentProfile,
        profilesList,
        fields,
        activities,
        workgroups,
        materials,
        materialCategories,
        workers,
        vehicles,
        materialLogs,
        allEntries,
        systemDestinations,
        switchProfile,
        createProfile,
        joinEstate,
        deleteEntry,
        updateEntry,
        addMaterialCategory,
        deleteMaterialCategory,
        updateMaterialCategory,
        refreshProfiles: fetchProfiles,
        refreshProfileData
    }), [isLoading, session, currentProfile, profilesList, fields, activities, workgroups, materials, materialCategories, workers, vehicles, materialLogs, allEntries, systemDestinations, fetchProfiles, refreshProfileData, addMaterialCategory, deleteMaterialCategory, updateMaterialCategory]);

    return (
        <ProfileContext.Provider value={value}>
            {children}
        </ProfileContext.Provider>
    );
};
