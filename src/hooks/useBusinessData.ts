import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SERVICES as CONSTANT_SERVICES } from '../lib/constants';

export const useBusinessData = () => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'services'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Fallback to constants if collection is empty
        setServices(CONSTANT_SERVICES);
      } else {
        const list: any[] = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setServices(list);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading services:", error);
      setServices(CONSTANT_SERVICES);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { services, loading };
};
