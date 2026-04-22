import csv
import os
import glob

def calculate_confusion_matrix(csv_file):
    metrics = {
        "Baseline": {"TP": 0, "TN": 0, "FP": 0, "FN": 0},
        "GraphRAG": {"TP": 0, "TN": 0, "FP": 0, "FN": 0}
    }

    with open(csv_file, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Reconstruct the boolean expectations and predictions
            expected = row['Expected_Match'] == 'True'
            base_pred = float(row['Baseline_Score']) > 0.5
            gr_pred = float(row['GraphRAG_Score']) > 0.5

            # Baseline Metrics
            if expected and base_pred: metrics["Baseline"]["TP"] += 1
            elif not expected and not base_pred: metrics["Baseline"]["TN"] += 1
            elif not expected and base_pred: metrics["Baseline"]["FP"] += 1
            elif expected and not base_pred: metrics["Baseline"]["FN"] += 1

            # GraphRAG Metrics
            if expected and gr_pred: metrics["GraphRAG"]["TP"] += 1
            elif not expected and not gr_pred: metrics["GraphRAG"]["TN"] += 1
            elif not expected and gr_pred: metrics["GraphRAG"]["FP"] += 1
            elif expected and not gr_pred: metrics["GraphRAG"]["FN"] += 1

    return metrics

def print_advanced_metrics(metrics):
    # Calculate advanced metrics
    for model, m in metrics.items():
        tp, tn, fp, fn = m["TP"], m["TN"], m["FP"], m["FN"]
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        accuracy = (tp + tn) / (tp + tn + fp + fn)

        metrics[model]["Precision"] = precision
        metrics[model]["Recall"] = recall
        metrics[model]["F1"] = f1
        metrics[model]["Accuracy"] = accuracy

    # Format the console output as an academic table
    print("="*65)
    print(f"{'Metric':<18} | {'SBERT Baseline':<18} | {'GraphRAG Pipeline':<18}")
    print("-" * 65)
    print(f"{'True Positives':<18} | {metrics['Baseline']['TP']:<18} | {metrics['GraphRAG']['TP']:<18}")
    print(f"{'True Negatives':<18} | {metrics['Baseline']['TN']:<18} | {metrics['GraphRAG']['TN']:<18}")
    print(f"{'False Positives':<18} | {metrics['Baseline']['FP']:<18} | {metrics['GraphRAG']['FP']:<18}")
    print(f"{'False Negatives':<18} | {metrics['Baseline']['FN']:<18} | {metrics['GraphRAG']['FN']:<18}")
    print("-" * 65)
    print(f"{'Accuracy':<18} | {metrics['Baseline']['Accuracy']:.4f}{' '*12} | {metrics['GraphRAG']['Accuracy']:.4f}")
    print(f"{'Precision':<18} | {metrics['Baseline']['Precision']:.4f}{' '*12} | {metrics['GraphRAG']['Precision']:.4f}")
    print(f"{'Recall':<18} | {metrics['Baseline']['Recall']:.4f}{' '*12} | {metrics['GraphRAG']['Recall']:.4f}")
    print(f"{'F1-Score':<18} | {metrics['Baseline']['F1']:.4f}{' '*12} | {metrics['GraphRAG']['F1']:.4f}")
    print("="*65)

if __name__ == "__main__":
    # Auto-find the most recent evaluation CSV in the directory
    directory = os.path.dirname(os.path.abspath(__file__))
    list_of_files = glob.glob(os.path.join(directory, 'evaluation_results_*.csv'))

    if not list_of_files:
        print("No evaluation CSV files found.")
    else:
        latest_file = max(list_of_files, key=os.path.getctime)
        print(f"Analyzing: {os.path.basename(latest_file)}\n")
        results = calculate_confusion_matrix(latest_file)
        print_advanced_metrics(results)