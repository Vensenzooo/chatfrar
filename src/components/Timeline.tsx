import { useScroll, useTransform, motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface TimelineItem {
  title: string;
  content: string;
  hours: number;
  issues: string;
  solutions: string;
}

export const Timeline = () => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  const data: TimelineItem[] = [
    { 
      title: "Semaine 1", 
      content: "Introduction au projet, recherche et planification des fonctionnalités de l'application.", 
      hours: 20, 
      issues: "Difficulté à définir précisément le champ d'application du projet et les fonctionnalités prioritaires.", 
      solutions: "Organisation d'une session de brainstorming et création d'une carte mentale pour visualiser les fonctionnalités." 
    },
    { 
      title: "Semaine 2", 
      content: "Mise en place de l'architecture du projet, configuration de l'environnement de développement.", 
      hours: 25, 
      issues: "Problèmes de compatibilité entre les différentes versions des dépendances React et des plugins Vite.", 
      solutions: "Création d'un environnement standardisé avec des versions spécifiques documentées."
    },
    { 
      title: "Semaine 3", 
      content: "Développement de la structure principale du frontend avec React et intégration de Tailwind.", 
      hours: 35, 
      issues: "Difficultés avec la configuration de Tailwind et des animations personnalisées.", 
      solutions: "Utilisation de plugins supplémentaires et optimisation du fichier de configuration tailwind.config.js." 
    },
    { 
      title: "Semaine 4", 
      content: "Mise en place du système d'authentification et gestion des utilisateurs.", 
      hours: 30, 
      issues: "Vulnérabilités de sécurité détectées dans le système d'authentification initial.", 
      solutions: "Implémentation de JWT avec refresh tokens et amélioration du cryptage des mots de passe."
    },
    { 
      title: "Semaine 6", 
      content: "Création de l'interface de chat en temps réel, intégration des fonctionnalités de chat privé et de groupe.", 
      hours: 35, 
      issues: "Problèmes de performances avec de nombreuses connexions WebSocket simultanées.", 
      solutions: "Optimisation des connexions et mise en place d'un système de limitation des connexions par utilisateur."
    },
    { 
      title: "Semaine 7", 
      content: "Implémentation du système d'invitation d'amis et de gestion des profils utilisateurs.", 
      hours: 30, 
      issues: "Interface utilisateur confuse pour la gestion des invitations et des contacts.", 
      solutions: "Refonte de l'UI avec des tests utilisateurs et amélioration des notifications."
    },
    { 
      title: "Semaine 8", 
      content: "Tests, débogage et optimisation de l'application.", 
      hours: 35, 
      issues: "Nombreux bugs d'UI et problèmes de performance sur les appareils mobiles.", 
      solutions: "Optimisation du code avec React.memo et useCallback, implémentation du lazy loading."
    },
    { 
      title: "Semaine 9", 
      content: "Finalisation du projet et préparation pour la présentation finale.", 
      hours: 40, 
      issues: "Stress de dernière minute et découverte de bugs mineurs.", 
      solutions: "Révision complète et résolution systématique avec une checklist détaillée."
    }
  ];

  const cumulativeHours = data.map((_, index) => {
    return data.slice(0, index + 1).reduce((sum, week) => sum + week.hours, 0);
  });

  const toggleSelectedWeek = (index: number) => {
    if (selectedWeek === index) {
      setSelectedWeek(null);
    } else {
      setSelectedWeek(index);
    }
  };

  const calculateProgress = (cumHours: number) => {
    const totalRequiredHours = 250;
    return Math.min(250, (cumHours / totalRequiredHours) * 100).toFixed(1);
  };

  return (
    <div className="w-full bg-slate-950 font-sans md:px-10" ref={containerRef}>
      <div className="max-w-7xl mx-auto py-20 px-4 md:px-8 lg:px-10">
        <h2 className="text-lg md:text-4xl mb-4 text-white max-w-4xl">Notre Progression</h2>
        <p className="text-neutral-300 text-sm md:text-base max-w-sm">
          Découvrez les différentes étapes de développement de ChatFrar
        </p>
      </div>

      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <div key={index} className="flex justify-start pt-10 md:pt-40 md:gap-10">
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <motion.div
                className={`h-10 absolute left-3 md:left-3 w-10 rounded-full flex items-center justify-center cursor-pointer
                  ${selectedWeek === index ? 'bg-purple-600' : 'bg-slate-950'}`}
                whileHover={{ scale: 1.2 }}
                onClick={() => toggleSelectedWeek(index)}
              >
                <div
                  className={`h-4 w-4 rounded-full p-2 border 
                  ${selectedWeek === index
                    ? 'bg-purple-400 border-white'
                    : 'bg-neutral-800 border-neutral-700'
                  }`}
                />
              </motion.div>
              <h3
                className={`hidden md:block text-xl md:pl-20 md:text-5xl font-bold cursor-pointer transition-colors
                  ${selectedWeek === index ? 'text-purple-400' : 'text-neutral-500'}`}
                onClick={() => toggleSelectedWeek(index)}
              >
                {item.title}
              </h3>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3
                className={`md:hidden block text-2xl mb-4 text-left font-bold cursor-pointer transition-colors
                  ${selectedWeek === index ? 'text-purple-400' : 'text-neutral-500'}`}
                onClick={() => toggleSelectedWeek(index)}
              >
                {item.title}
              </h3>

              <p
                className={`${selectedWeek === index ? 'text-white' : 'text-neutral-300'} 
                  cursor-pointer hover:text-white transition-colors`}
                onClick={() => toggleSelectedWeek(index)}
              >
                {item.content}
              </p>

              <AnimatePresence>
                {selectedWeek === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 mb-6 overflow-hidden"
                  >
                    <div className="bg-gray-900/60 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
                      <div className="mb-4">
                        <h4 className="text-purple-400 font-medium mb-2">Progression du projet</h4>
                        <div className="flex flex-col">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Cette phase: {item.hours} heures</span>
                            <span>Cumulatif: {cumulativeHours[index]} heures sur 250 heures</span>
                          </div>
                          <div className="h-4 w-full bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${calculateProgress(cumulativeHours[index])}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                            />
                          </div>
                          <div className="text-right text-xs text-gray-400 mt-1">
                            {calculateProgress(cumulativeHours[index])}% complété
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                          <h4 className="text-red-400 font-medium mb-2">Défis rencontrés</h4>
                          <p className="text-sm text-gray-300">{item.issues}</p>
                        </div>

                        <div className="bg-gray-800/50 p-4 rounded-lg">
                          <h4 className="text-green-400 font-medium mb-2">Solutions apportées</h4>
                          <p className="text-sm text-gray-300">{item.solutions}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}

        <div style={{ height: height + "px" }} className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-neutral-700 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]">
          <motion.div style={{ height: heightTransform, opacity: opacityTransform }} className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-purple-500 via-pink-500 to-transparent from-[0%] via-[10%] rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default Timeline; 